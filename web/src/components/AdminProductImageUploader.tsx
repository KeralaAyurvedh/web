"use client";

import { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(new Error("Could not read selected image"));
    reader.readAsDataURL(file);
  });
}

export function AdminProductImageUploader() {
  const [productId, setProductId] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setImageUrl("");

    if (!productId.trim() || !token.trim() || !file) {
      setMessage("Enter product ID, admin token, and choose an image.");
      return;
    }
    if (!allowedTypes.has(file.type)) {
      setMessage("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage("Product image must be under 3 MB.");
      return;
    }

    try {
      setLoading(true);
      const base64 = await readFileAsBase64(file);
      const response = await fetch(`${API_URL}/admin/products/${encodeURIComponent(productId.trim())}/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Upload failed");
      }
      setImageUrl(data.imageUrl || "");
      setMessage("Image uploaded and product listing updated.");
      setFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={uploadImage} className="space-y-5 text-left">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="product-id">
          Product ID
        </label>
        <input
          id="product-id"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="Paste product UUID"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="admin-token">
          Admin token
        </label>
        <input
          id="admin-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="Bearer token from admin login"
          type="password"
        />
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 transition hover:border-brand-400 hover:bg-brand-50">
        <span>
          <span className="block text-sm font-semibold text-slate-800">{file ? file.name : "Choose product image"}</span>
          <span className="mt-1 block text-xs text-slate-500">JPEG, PNG, or WebP up to 3 MB</span>
        </span>
        <ImageUp className="h-5 w-5 text-brand-600" aria-hidden="true" />
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageUp className="h-4 w-4" aria-hidden="true" />}
        Upload image
      </button>
      {message ? <p className="text-sm font-medium text-slate-700">{message}</p> : null}
      {imageUrl ? (
        <a className="block break-all text-sm font-semibold text-brand-700 hover:text-brand-500" href={imageUrl} target="_blank" rel="noreferrer">
          {imageUrl}
        </a>
      ) : null}
    </form>
  );
}
