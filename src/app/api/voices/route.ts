import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const language = searchParams.get("language") || "en";
  
  // Mock voice data based on language
  const voices = [
    {
      voice_id: "voice1",
      name: "John Smith",
      gender: "male",
      descriptive: "Deep and clear",
      preview_url: "https://example.com/voice-samples/voice1.mp3"
    },
    {
      voice_id: "voice2",
      name: "Jane Doe",
      gender: "female",
      descriptive: "Warm and friendly",
      preview_url: "https://example.com/voice-samples/voice2.mp3"
    },
    {
      voice_id: "voice3",
      name: "Alex Johnson",
      gender: "male",
      descriptive: "Professional and articulate",
      preview_url: "https://example.com/voice-samples/voice3.mp3"
    }
  ];
  
  return NextResponse.json(voices);
}