import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// ================================
// CONFIG PATHS
// ================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ================================
// MIDDLEWARES
// ================================
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ================================
// CONEXÃO MYSQL RAILWAY (COM CORREÇÃO DE LOG)
// ================================
let pool;

try {
  console.log("🌍 Conectando ao MySQL do Railway...");

  pool = mysql.createPool({
    // Usando prefixo MYSQL_ com underline para maior compatibilidade na Railway
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT),
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
  });

  // Teste de conexão assíncrona
  (async () => {
    const conn = await pool.getConnection();
    console.log("✅ MySQL conectado com sucesso.");
    conn.release();
  })();

} catch (err) {
  // CORREÇÃO CRUCIAL: Captura o erro completo do MySQL para depuração
  console.error("❌ ERRO FATAL no MySQL:", err);
  // Não fazemos process.exit(1) aqui para permitir que o app suba e revele erros de frontend/API
}


// ================================
// FRONTEND & ARQUIVOS ESTÁTICOS
// ================================
// Caminho para a raiz do projeto (..) e depois para a pasta 'frontend'
app.use(express.static(path.join(__dirname, "..", "frontend")));


// ================================
// ROTAS API (SUAS ROTAS)
// ================================

// Rota de Teste (Ping)
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Rota de Registro
app.post("/api/registrar", async (req, res) => {
  // Seu código de registro aqui, usando 'pool'
  const { nome, email, senha, foto, tipo_usuario } = req.body;
  
  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios faltando." });
  }

  try// ================================
// REGISTRO (CORRIGIDO)
// ================================
app.post("/api/registrar", async (req, res) => {
    const { nome, email, senha, foto, tipo_usuario } = req.body;
    // ... (suas verificações de campos)

    try {
        // ... (seu código de verificação e hashing)

        const hash = await bcrypt.hash(senha, 10);
        const token = crypto.randomBytes(32).toString("hex");

        await pool.query(`
            INSERT INTO usuarios
            (nome, email, senha, foto, pontos, online, tipo_usuario, confirmado, token_confirmacao)
            VALUES (?, ?, ?, ?, 0, FALSE, ?, FALSE, ?)
        `, [
            nome,             // 1. ?
            email,            // 2. ?
            hash,             // 3. ? (Senha criptografada)
            foto || null,     // 4. ?
            tipo_usuario,     // 5. ?
            token             // 6. ?
        ]); // <--- AGORA A SINTAXE DO ARRAY ESTÁ CORRETA.

        res.json({ success: true, message: "Conta criada. Confirme por e-mail." });

    } catch (err) {
        console.error("❌ REGISTRO:", err.message);
        res.status(500).json({ success: false, error: "Erro interno" });
    }
});
   // Verificar se o email já existe
    const [rows] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length > 0) {
      return res.status(400).json({ success: false, error: "Email já registrado." });
    }         

// ... Inclua todas as suas outras rotas (Login, Desafios, etc.) aqui ...


// ================================
// CATCH-ALL PARA SPA (Single Page Application)
// ================================
app.get("*", (req, res) => {
  // CORREÇÃO ENOENT: Caminho correto é da raiz do backend (..) -> frontend -> html -> index.html
  res.sendFile(path.join(__dirname, "..", "frontend", "html", "index.html"));
});


// ================================
// INICIAR SERVIDOR
// ================================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Essencial para containers

// CORREÇÃO NOT FOUND: Bindar ao HOST '0.0.0.0'
app.listen(PORT, HOST, () => console.log(`🚀 Rodando em http://${HOST}:${PORT}`));