const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());
const ZENVIA_TOKEN = process.env.ZENVIA_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const ZENVIA_SENDER = process.env.ZENVIA_SENDER;
// Cargar base de clientes al iniciar
let clientes = [];
try {
const data = fs.readFileSync(path.join(__dirname, 'clientes.json'), 'utf8');
clientes = JSON.parse(data);
console.log(`Base de clientes cargada: ${clientes.length} registros`);
} catch (e) {
console.error('No se pudo cargar clientes.json:', e.message);
}
// ─── ENDPOINT CONSULTA CLIENTE ───────────────────────────────────────────────
app.get('/cliente', (req, res) => {
const { dni, nombre } = req.query;
if (!dni && !nombre) {
return res.status(400).json({ error: 'Parámetro dni o nombre requerido' });
}
let cliente = null;
if (dni) {
const dniBuscar = dni.replace(/\D/g, '').trim();
cliente = clientes.find(c => c.dni === dniBuscar);
}
if (!cliente && nombre) {
const nombreBuscar = nombre.toLowerCase().trim();
cliente = clientes.find(c =>
c.nombre.toLowerCase().includes(nombreBuscar)
);
}
if (!cliente) {
return res.status(404).json({ encontrado: false, mensaje: 'Cliente no encontrado' });
}
return res.json({
encontrado: true,
nombre: cliente.nombre,
dni: cliente.dni,
nro_suscripcion: cliente.nro_suscripcion,
plan: cliente.plan,
valor_nominal: `$${Number(cliente.valor_nominal).toLocaleString('es-AR')}`,
cuotas_emitidas: cliente.cuotas_emitidas,
cuotas_pagas: cliente.cuotas_pagas,
estado: cliente.estado
});
});
// ─── WEBHOOK ZENVIA ──────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
res.sendStatus(200);
const msg = req.body;
const userPhone = msg.from;
const userText = msg.contents?.[0]?.text;
if (!userText) return;
try {
const claudeRes = await axios.post(
'https://api.anthropic.com/v1/messages',
{
model: 'claude-sonnet-4-20250514',
max_tokens: 1024,
system: `Sos Sebastián Correa, asesor de Autocrédito. Respondés por WhatsApp de forma messages: [{ role: 'user', content: userText }]
},
{
headers: {
'x-api-key': CLAUDE_API_KEY,
'anthropic-version': '2023-06-01',
'Content-Type': 'application/json'
}
}
);
const reply = claudeRes.data.content[0].text;
await axios.post(
'https://api.zenvia.com/v2/channels/whatsapp/messages',
{
from: ZENVIA_SENDER,
to: userPhone,
contents: [{ type: 'text', text: reply }]
},
{
headers: {
'X-API-TOKEN': ZENVIA_TOKEN,
'Content-Type': 'application/json'
}
}
);
} catch (error) {
console.error('Error:', error.response?.data || error.message);
}
});
app.listen(3000, () => console.log('Servidor corriendo'));
