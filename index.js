require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json()); // Menerima request JSON

// Inisialisasi Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

// Helper function untuk format response
const sendResponse = (
  res,
  success,
  data = null,
  errors = null,
  statusCode = 200,
) => {
  const response = { success };
  if (success) response.data = data;
  else response.errors = errors;

  return res.status(statusCode).json(response);
};

// --- ROUTES CRUD ---

// 0. Root Check
app.get("/", (req, res) => {
  sendResponse(res, true, "API is running on Vercel!");
});

// 1. CREATE (POST)
app.post("/items", async (req, res) => {
  const { name, description } = req.body;
  const { data, error } = await supabase
    .from("items")
    .insert([{ name, description }])
    .select();

  if (error) return sendResponse(res, false, null, error.message, 400);
  return sendResponse(res, true, data[0], null, 201);
});

// 2. READ ALL (GET)
app.get("/items", async (req, res) => {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("id", { ascending: true });

  if (error) return sendResponse(res, false, null, error.message, 400);
  return sendResponse(res, true, data);
});

// 3. READ ONE (GET BY ID)
app.get("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return sendResponse(res, false, null, "Item not found", 404);
  return sendResponse(res, true, data);
});

// 4. UPDATE (PUT)
app.put("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const { data, error } = await supabase
    .from("items")
    .update({ name, description })
    .eq("id", id)
    .select();

  if (error) return sendResponse(res, false, null, error.message, 400);
  if (data.length === 0)
    return sendResponse(res, false, null, "Item not found", 404);

  return sendResponse(res, true, data[0]);
});

// 5. DELETE (DELETE)
app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .select();

  if (error) return sendResponse(res, false, null, error.message, 400);
  if (data.length === 0)
    return sendResponse(res, false, null, "Item not found", 404);

  return sendResponse(res, true, "Item deleted successfully");
});

// Vercel tidak butuh app.listen, tapi untuk test lokal di Xubuntu kita butuh:
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  );
}

// Export app agar bisa dibaca oleh Vercel Serverless Function
module.exports = app;
