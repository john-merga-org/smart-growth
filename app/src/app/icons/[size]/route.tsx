import { ImageResponse } from "next/og";
import { Mark } from "../mark";

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(<Mark size={size} />, { width: size, height: size });
}
