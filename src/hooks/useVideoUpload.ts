import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  objectKey: string;
  publicUrl: string;
}

const PROXY_FALLBACK_LIMIT = 40 * 1024 * 1024; // 40MB

/**
 * Upload a video file to Cloudflare R2.
 *
 * Flow:
 *  1. Ask edge function for a presigned PUT URL.
 *  2. Try direct browser PUT to R2 (fast, supports any size).
 *  3. If the browser PUT fails with a network/CORS error AND the file is
 *     small enough, fall back to a server-side proxy upload via edge function.
 *     This makes uploads resilient even when R2 CORS isn't configured.
 */
export async function uploadVideoToR2(
  file: File,
  onProgress: (percent: number) => void,
  courseId?: string,
): Promise<UploadResult> {
  // 1. Get presigned URL + object key
  const { data, error } = await supabase.functions.invoke("creator-upload-url", {
    body: {
      fileName: file.name,
      fileType: file.type || "video/mp4",
      fileSize: file.size,
      course_id: courseId,
    },
  });

  if (error) throw new Error(error.message || "Failed to get upload URL");
  const uploadUrl: string | undefined = data?.uploadUrl ?? data?.upload_url;
  const objectKey: string | undefined = data?.objectKey ?? data?.object_key;
  const publicUrl: string = data?.publicUrl ?? data?.public_url ?? "";
  if (!uploadUrl || !objectKey) throw new Error("Invalid upload URL response");

  // 2. Try direct PUT to R2
  try {
    await directPut(uploadUrl, file, onProgress);
    return { objectKey, publicUrl };
  } catch (err: any) {
    // 3. Fallback to proxy if direct upload failed with a network/CORS error
    const isNetworkError = err?.code === "NETWORK" || err?.code === "TIMEOUT";
    if (!isNetworkError) throw err;
    if (file.size > PROXY_FALLBACK_LIMIT) {
      throw new Error(
        "Direct upload to R2 failed (CORS not configured on the bucket). " +
        "Files larger than 40MB require R2 CORS to be set up. " +
        "Ask the admin to add the Backupshala CORS policy to the R2 bucket."
      );
    }
    onProgress(0);
    await proxyPut(objectKey, file, onProgress);
    return { objectKey, publicUrl };
  }
}

function directPut(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(Object.assign(new Error(`R2 rejected upload (HTTP ${xhr.status})`), { code: "HTTP" }));
    };
    xhr.onerror = () => reject(Object.assign(
      new Error("Browser blocked PUT to R2 (likely CORS). Trying server fallback…"),
      { code: "NETWORK" }
    ));
    xhr.ontimeout = () => reject(Object.assign(new Error("Upload timed out"), { code: "TIMEOUT" }));
    xhr.timeout = 30 * 60 * 1000;
    xhr.send(file);
  });
}

async function proxyPut(objectKey: string, file: File, onProgress: (p: number) => void) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creator-proxy-upload`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-object-key", objectKey);
    xhr.setRequestHeader("x-content-type", file.type || "video/mp4");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Proxy upload failed (HTTP ${xhr.status})`;
      try { msg = JSON.parse(xhr.responseText)?.error || msg; } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during proxy upload"));
    xhr.ontimeout = () => reject(new Error("Proxy upload timed out"));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(file);
  });
}
