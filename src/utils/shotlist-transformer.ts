import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import { ShotlistItem } from "@/hooks/use-shotlist";

/**
 * Convert S3 URL format to HTTPS if needed
 */
export const convertS3UrlToHttps = (s3Location: string | null | undefined): string => {
  // Handle null/undefined values
  if (!s3Location) {
    console.warn('s3Location is null or undefined');
    return '';
  }
  
  if (s3Location.startsWith('s3://')) {
    const s3Match = s3Location.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (s3Match) {
      const [, bucket, key] = s3Match;
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
  }
  return s3Location;
};

/**
 * Create a mapping between shotlist chunk_ids and user videos
 */
export const createVideoMapping = (userVideos: any[]): Record<string, any> => {
  const mapping: Record<string, any> = {};
  
  userVideos.forEach(video => {
    if (!video.s3_location) return;
    
    // Extract the base filename without extension for matching
    const filename = video.original_name || video.file_name || '';
    const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Add the video to the mapping with various potential matching patterns
    mapping[baseFilename] = video;
    
    // Also try with timestamp prefix patterns
    const timestampMatch = filename.match(/^(\d+)-(.+)/);
    if (timestampMatch) {
      const [, , nameWithoutTimestamp] = timestampMatch;
      const baseWithoutTimestamp = nameWithoutTimestamp.replace(/\.[^/.]+$/, '');
      mapping[baseWithoutTimestamp] = video;
    }
    
    // Add direct chunk_id pattern match
    const chunkPattern = `${baseFilename}_chunk_1_0.0-0.0s`;
    mapping[chunkPattern] = video;
  });
  
  return mapping;
};

/**
 * Find the best matching video for a shotlist item
 */
export const findMatchingVideo = (
  shot: ShotlistItem, 
  videoMapping: Record<string, any>
): any | null => {
  // Try direct match with chunk_id
  if (videoMapping[shot.chunk_id]) {
    return videoMapping[shot.chunk_id];
  }
  
  // Try to extract base name from chunk_id
  const chunkIdParts = shot.chunk_id.split('_chunk_');
  if (chunkIdParts.length > 0) {
    const baseName = chunkIdParts[0];
    if (videoMapping[baseName]) {
      return videoMapping[baseName];
    }
  }
  
  // Try matching with any part of the chunk_id
  for (const key in videoMapping) {
    if (shot.chunk_id.includes(key) || key.includes(shot.chunk_id)) {
      return videoMapping[key];
    }
  }
  
  return null;
};

/**
 * Transform shotlist items into timeline video items
 */
export const transformShotlistToTimelineItems = (
  shotlist: ShotlistItem[],
  userVideos: any[]
): Partial<IVideo>[] => {
  if (!shotlist.length || !userVideos.length) {
    return [];
  }
  
  // Create video mapping
  const videoMapping = createVideoMapping(userVideos);
  
  // Sort shotlist by shot_number
  const sortedShotlist = [...shotlist].sort((a, b) => a.shot_number - b.shot_number);
  
  // Transform shotlist to timeline items
  let currentTimelinePosition = 0;
  
  return sortedShotlist
    .map(shot => {
      // Find matching video
      const matchingVideo = findMatchingVideo(shot, videoMapping);
      
      if (!matchingVideo) {
        console.warn(`No matching video found for shot ${shot.shot_number} (${shot.chunk_id})`);
        return null;
      }
      
      // Convert timing from seconds to milliseconds
      const startMs = shot.precise_timing.start * 1000;
      const endMs = shot.precise_timing.end * 1000;
      const durationMs = shot.precise_timing.duration * 1000;
      
      // Calculate timeline position
      const timelineStart = currentTimelinePosition;
      const timelineEnd = currentTimelinePosition + durationMs;
      
      // Update position for next video
      currentTimelinePosition = timelineEnd;
      
      const videoUrl = convertS3UrlToHttps(matchingVideo.s3_location);
      
      return {
        id: generateId(),
        name: `Shot ${shot.shot_number}: ${shot.content_preview}`,
        type: "video" as const,
        display: {
          from: timelineStart,
          to: timelineEnd,
        },
        duration: durationMs,
        details: {
          src: videoUrl,
          width: 1080,
          height: 1920,
          volume: 1,
          left: 0,
          top: 0,
        },
        metadata: {
          previewUrl: matchingVideo.thumbnail_url || videoUrl,
          filename: shot.chunk_id,
          shotNumber: shot.shot_number,
          scriptSegment: shot.script_segment,
          contentPreview: shot.content_preview,
          narrativePurpose: shot.narrative_purpose,
          cutReasoning: shot.cut_reasoning,
          qualityNotes: shot.quality_notes,
        },
        trim: {
          from: startMs,
          to: endMs,
        },
        playbackRate: 1,
      };
    })
    .filter(Boolean) as Partial<IVideo>[];
};