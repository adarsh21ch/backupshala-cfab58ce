import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  objectKey: string;
  publicUrl: string;
}

/**
 * Upload a video file to Cloudflare R2 via a presigned PUT URL.
 * Calls the `creator-upload-url` edge function for the signed URL,
 * then PUTs the file directly with progress tracking.
 */
export async function uploadVideoToR2(
  file: File,
  onProgress: (percent: number) => void,
  courseId?: string,
): Promise<UploadResult> {
  // 1. Get presigned URL
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

  // 2. PUT file via XHR for progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller file."));
    xhr.timeout = 30 * 60 * 1000;

    xhr.send(file);
  });

  return { objectKey, publicUrl };
}
