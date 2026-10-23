// Trae los cobros recibidos en Mercado Pago. Solo responde a usuarios logueados en el sistema.
const SB_URL = "https://xbujsjsavlvsriiwqajv.supabase.co";
const SB_KEY = "sb_publishable_dtF1D0BitTNQYNRWXEBh4Q__ENTmpzQ";

async function usuario(req) {
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: "Bearer " + jwt } });
  return r.ok ? r.json() : null;
}

const pick = (p) => {
  const bi = (p.point_of_interaction && p.point_of_interaction.transaction_data && p.point_of_interaction.transaction_data.bank_info) || {};
  const bp = bi.payer || {}, py = p.payer || {}, idn = py.identification || {};
  const nombre = bp.account_holder_name || [py.first_name, py.last_name].filter(Boolean).join(" ") || (p.additional_info && p.additional_info.payer && p.additional_info.payer.first_name) || "";
  return {
    id: String(p.id), fecha: p.date_approved || p.date_created, monto: p.transaction_amount,
    neto: p.transaction_details && p.transaction_details.net_received_amount,
    // en las transferencias desde otro banco (CVU) MP no manda el documento de quien transfiere
    nombre, doc: p.payment_method_id === "cvu" ? null : idn.number || null,
    banco: bp.long_name || null, tipo: p.payment_type_id, metodo: p.payment_method_id, op: p.operation_type,
    desc: p.description || null, estado: p.status,
  };
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const tok = process.env.MP_ACCESS_TOKEN;
  if (!tok) return res.status(500).json({ error: "Falta MP_ACCESS_TOKEN" });
  if (!(await usuario(req))) return res.status(401).json({ error: "No autorizado" });
  const dias = Math.min(Math.max(parseInt(req.query.dias || "7", 10) || 7, 1), 62);
  const desde = new Date(Date.now() - dias * 864e5).toISOString();
  const me = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: "Bearer " + tok } });
  if (!me.ok) return res.status(502).json({ error: "Mercado Pago respondió " + me.status });
  const yo = (await me.json()).id;
  const out = [];
  for (let off = 0; off < 1000; off += 100) {
    const u = "https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created"
      + "&begin_date=" + encodeURIComponent(desde) + "&end_date=NOW&limit=100&offset=" + off;
    const r = await fetch(u, { headers: { Authorization: "Bearer " + tok } });
    if (!r.ok) return res.status(502).json({ error: "Mercado Pago respondió " + r.status });
    const j = await r.json(), L = j.results || [];
    // entra: cobrado por el gym (las transferencias desde otro banco al CVU figuran como "account_fund" con el gym de pagador)
    // sale: pagado por el gym a otro (compras, pagos con QR, transferencias a otra cuenta de MP)
    L.filter((p) => p.status === "approved").forEach((p) => {
      const entra = p.collector_id == yo && (p.operation_type === "account_fund" || (p.payer || {}).id != yo);
      const sale = !entra && (p.payer || {}).id == yo && p.collector_id != yo;
      if (entra || sale) out.push({ ...pick(p), dir: entra ? "in" : "out" });
    });
    if (L.length < 100) break;
  }
  res.json({ desde, pagos: out });
};
