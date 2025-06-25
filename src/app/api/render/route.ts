import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Mock response for the render API
    return NextResponse.json({
      video: {
        id: "mock-video-id-" + Date.now(),
        status: "PENDING",
        progress: 0
      }
    });
  } catch (error) {
    console.error("Error in render API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  
  if (!id || !type) {
    return NextResponse.json({ error: "Missing id or type" }, { status: 400 });
  }
  
  // Mock response for the render status API
  // In a real implementation, this would check the actual status of the render job
  return NextResponse.json({
    video: {
      id,
      status: "COMPLETED",
      progress: 100,
      url: "https://example.com/mock-video.mp4"
    }
  });
}