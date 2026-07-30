require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileupload = require("express-fileupload");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(fileupload());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

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

app.get("/", (req, res) => {
  res.redirect("/items");
});

app.post("/items", async (req, res) => {
  const { name, description } = req.body;
  const file = req.files["image"];
  let fileName = file ? `${Date.now()}_${file.name}` : null;
  if (file) {
    const { data: storageData, error: storageError } = await supabase.storage
      .from("simple-backend")
      .upload(fileName, file.data, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (storageError) throw new Error(`Storage Error: ${storageError.message}`);
    const { data: publicUrlData } = await supabase.storage
      .from("simple-backend")
      .getPublicUrl(fileName);

    fileName = publicUrlData.publicUrl;
  }
  const { data, error } = await supabase
    .from("items")
    .insert([{ name, description, image_path: fileName }])
    .select();

  if (error) return sendResponse(res, false, null, error.message, 400);
  return sendResponse(res, true, data[0], null, 201);
});

app.get("/items", async (req, res) => {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("id", { ascending: false });

  if (error) return sendResponse(res, false, null, error.message, 400);
  return sendResponse(res, true, data);
});

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

app.patch("/items/:id", async (req, res) => {
  const { id } = req.params,
    payload = req.body,
    file = req.files["image"];
  let fileName = file ? `${Date.now()}_${file.name}` : null;

  if (file) {
    const oldFile = await supabase
      .from("items")
      .select("image_path")
      .eq("id", id)
      .single()
      .then(({ data }) => data.image_path.split("/").at(-1));

    await supabase.storage
      .from("simple-backend")
      .remove(decodeURIComponent(oldFile));

    const upload = await supabase.storage
      .from("simple-backend")
      .upload(fileName, file.data, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (upload.error)
      throw new Error(`Storage Error : ${upload.error.message}`);

    const publicImage = await supabase.storage
      .from("simple-backend")
      .getPublicUrl(fileName);

    payload["image_path"] = publicImage.data.publicUrl;
  }

  const { data, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", id)
    .select();

  if (error) return sendResponse(res, false, null, error.message, 400);
  if (data.length === 0)
    return sendResponse(res, false, null, "Item not found", 404);

  return sendResponse(res, true, data[0]);
});

app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;
  const file = await supabase
    .from("items")
    .select("image_path")
    .eq("id", id)
    .single()
    .then(({ data }) => data.image_path.split("/").at(-1));
  await supabase.storage
    .from("simple-backend")
    .remove(decodeURIComponent(file));

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

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  );
}

module.exports = app;
