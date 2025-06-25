import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, CLEAR_TIMELINE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

interface ShotlistItem {
  chunk_id: string;
  shot_number: number;
  cut_reasoning: string;
  quality_notes: string;
  precise_timing: {
    end: number;
    start: number;
    duration: number;
  };
  script_segment: string;
  content_preview: string;
  narrative_purpose: string;
}

interface VideoMapping {
  [chunk_id: string]: string; // Maps chunk_id to video URL
}

/**
 * Convert S3 URL format to HTTPS if needed
 */
const convertS3UrlToHttps = (s3Location: string | null | undefined): string => {
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
 * Create video mapping from user videos based on chunk_id patterns
 */
export const createVideoMapping = (userVideos: any[]): VideoMapping => {
  console.log('Creating video mapping from user videos:', userVideos);
  
  const mapping: VideoMapping = {};
  
  userVideos.forEach(video => {
    // Skip videos without s3_location
    if (!video.s3_location) {
      console.warn('Skipping video with no s3_location:', video);
      return;
    }
    
    // Extract the base filename without extension for matching
    const filename = video.original_name || video.file_name || '';
    console.log('Processing video:', { filename, s3_location: video.s3_location });
    
    const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Create mapping for chunk patterns that might match this video
    // This is a simple approach - in production you'd have more sophisticated matching
    const videoUrl = convertS3UrlToHttps(video.s3_location);
    
    // Add various potential chunk_id patterns for this video
    const chunkPattern = `${baseFilename}_chunk_1_0.0-0.0s`;
    mapping[chunkPattern] = videoUrl;
    console.log('Added mapping:', chunkPattern, '→', videoUrl);
    
    // Also try with timestamp prefix patterns
    const timestampMatch = filename.match(/^(\d+)-(.+)/);
    if (timestampMatch) {
      const [, timestamp, nameWithoutTimestamp] = timestampMatch;
      const baseWithoutTimestamp = nameWithoutTimestamp.replace(/\.[^/.]+$/, '');
      const timestampPattern = `${timestamp}-${baseWithoutTimestamp}_chunk_1_0.0-0.0s`;
      mapping[timestampPattern] = videoUrl;
      console.log('Added timestamp mapping:', timestampPattern, '→', videoUrl);
    }
  });
  
  console.log('Final video mapping:', mapping);
  return mapping;
};

/**
 * Load shotlist onto the timeline
 */
export const loadShotlistToTimeline = async (
  shotlist: ShotlistItem[], 
  userVideos: any[] = []
) => {
  console.log('loadShotlistToTimeline called with:', {
    shotlistLength: shotlist.length,
    userVideosLength: userVideos.length
  });
  
  try {
    // Clear timeline first to avoid duplicates
    console.log('Clearing timeline before loading shotlist');
    dispatch(CLEAR_TIMELINE, {});
    
    // Create video mapping from available user videos
    const videoMapping = createVideoMapping(userVideos);
    console.log('Video mapping created:', videoMapping);
    
    // Convert shotlist to timeline items
    let currentTimelinePosition = 0; // Start at beginning of timeline
    
    const trackItems = shotlist.map((shot, index) => {
      const videoUrl = videoMapping[shot.chunk_id];
      
      console.log(`Processing shot ${shot.shot_number}:`, {
        chunk_id: shot.chunk_id,
        found_video: !!videoUrl,
        videoUrl: videoUrl
      });
      
      if (!videoUrl) {
        console.warn(`No video found for chunk_id: ${shot.chunk_id}`);
        return null;
      }
      
      // Convert shot timing from seconds to milliseconds
      const startMs = shot.precise_timing.start * 1000;
      const endMs = shot.precise_timing.end * 1000;
      const durationMs = shot.precise_timing.duration * 1000;
      
      // Calculate timeline position
      const timelineStart = currentTimelinePosition;
      const timelineEnd = currentTimelinePosition + durationMs;
      
      // Update position for next video
      currentTimelinePosition = timelineEnd;
      
      const trackItem = {
        id: generateId(),
        name: `Shot ${shot.shot_number}: ${shot.content_preview}`,
        type: "video" as const,
        display: {
          from: timelineStart,
          to: timelineEnd,
        },
        duration: durationMs, // How long this clip plays on timeline
        details: {
          src: videoUrl,
          width: 1080, // Set default width for proper scaling
          height: 1920, // Set default height for proper scaling
          volume: 1,
          // Center the video in the frame
          left: 0,
          top: 0,
        },
        metadata: {
          previewUrl: videoUrl,
          filename: shot.chunk_id,
          shotNumber: shot.shot_number,
          scriptSegment: shot.script_segment,
          contentPreview: shot.content_preview,
          narrativePurpose: shot.narrative_purpose,
          cutReasoning: shot.cut_reasoning,
          qualityNotes: shot.quality_notes,
        },
        trim: {
          from: startMs, // Start trim at shot's start time within the video
          to: endMs,     // End trim at shot's end time within the video
        },
        playbackRate: 1,
      };
      
      return trackItem;
    }).filter(Boolean); // Remove null items
    
    console.log(`Loading ${trackItems.length} shots to timeline:`, trackItems);
    
    // Add each video individually to the main track
    if (trackItems.length > 0) {
      trackItems.forEach((trackItem, index) => {
        console.log(`Adding shot ${index + 1} to main track:`, trackItem);
        
        dispatch(ADD_VIDEO, {
          payload: trackItem,
          options: {
            resourceId: "main",  // Force all videos to main track
            scaleMode: "fit",
          },
        });
      });
      
      console.log(`Successfully loaded ${trackItems.length} shots to timeline`);
    } else {
      console.warn('No valid shots found to load');
    }
    
  } catch (error) {
    console.error('Error loading shotlist to timeline:', error);
  }
};

/**
 * Test shotlist using actual video filenames for debugging
 */
export const testShotlist: ShotlistItem[] = [
  {
    "chunk_id": "IMG_1462_chunk_1_0.0-0.0s",
    "shot_number": 1,
    "cut_reasoning": "Test shot 1",
    "quality_notes": "Clear audio, high confidence",
    "precise_timing": {"end": 4.8, "start": 0.2, "duration": 4.6},
    "script_segment": "segment_1",
    "content_preview": "First test video",
    "narrative_purpose": "Test first video"
  },
  {
    "chunk_id": "IMG_1271_chunk_1_0.0-0.0s",
    "shot_number": 2,
    "cut_reasoning": "Test shot 2",
    "quality_notes": "Good semantic match, clear audio",
    "precise_timing": {"end": 3.9, "start": 0.1, "duration": 3.8},
    "script_segment": "segment_2",
    "content_preview": "Second test video",
    "narrative_purpose": "Test second video"
  },
  {
    "chunk_id": "IMG_1272_chunk_1_0.0-0.0s",
    "shot_number": 3,
    "cut_reasoning": "Test shot 3",
    "quality_notes": "Clear audio, high confidence",
    "precise_timing": {"end": 5.8, "start": 0.2, "duration": 5.6},
    "script_segment": "segment_3",
    "content_preview": "Third test video",
    "narrative_purpose": "Test third video"
  }
];

/**
 * Mock shotlist data for testing
 */
export const mockShotlist: ShotlistItem[] = [
  {
    "chunk_id": "1750320963985-63rm0lu6i4j_chunk_1_0.0-0.0s",
    "shot_number": 1,
    "cut_reasoning": "Starts after initial pause, ends before transition",
    "quality_notes": "Clear audio, high confidence",
    "precise_timing": {"end": 4.8, "start": 0.2, "duration": 4.6},
    "script_segment": "segment_1",
    "content_preview": "Gary begins his search, establishing the initial conflict",
    "narrative_purpose": "Establishes the initial conflict with Gary's search"
  },
  {
    "chunk_id": "1750318045409-0dk6v3pp2pat_chunk_1_0.0-0.0s",
    "shot_number": 2,
    "cut_reasoning": "Natural sentence boundary, captures humor",
    "quality_notes": "Good semantic match, clear audio",
    "precise_timing": {"end": 3.9, "start": 0.1, "duration": 3.8},
    "script_segment": "segment_2",
    "content_preview": "Martha introduces herself with humor",
    "narrative_purpose": "Introduces Martha's character and her playful tone"
  },
  {
    "chunk_id": "1750321347255-9z0mj5sdl2a_chunk_1_0.0-0.0s",
    "shot_number": 3,
    "cut_reasoning": "Starts after initial pause, ends at natural boundary",
    "quality_notes": "Clear audio, high confidence",
    "precise_timing": {"end": 5.8, "start": 0.2, "duration": 5.6},
    "script_segment": "segment_3",
    "content_preview": "Gary expresses urgency in finding the keys",
    "narrative_purpose": "Highlights Gary's urgency and need for the keys"
  },
  {
    "chunk_id": "1750318133468-hxj970bhfj_chunk_1_0.0-0.0s",
    "shot_number": 4,
    "cut_reasoning": "Natural sentence boundary, maintains humor",
    "quality_notes": "Good semantic match, clear audio",
    "precise_timing": {"end": 4.9, "start": 0.1, "duration": 4.8},
    "script_segment": "segment_4",
    "content_preview": "Martha continues the playful banter",
    "narrative_purpose": "Continues the playful banter and misplacement theme"
  },
  {
    "chunk_id": "1750321550749-9vumkuayef_chunk_1_0.0-0.0s",
    "shot_number": 5,
    "cut_reasoning": "Starts after initial pause, ends at natural boundary",
    "quality_notes": "Clear audio, accusatory tone",
    "precise_timing": {"end": 4.8, "start": 0.2, "duration": 4.6},
    "script_segment": "segment_5",
    "content_preview": "Gary shows frustration and accuses Martha",
    "narrative_purpose": "Shows Gary's frustration and accusation"
  },
  {
    "chunk_id": "1750319884676-fbjfcv91a8_chunk_1_0.0-0.0s",
    "shot_number": 6,
    "cut_reasoning": "Natural sentence boundary, captures playful tone",
    "quality_notes": "Clear audio, mock-serious tone",
    "precise_timing": {"end": 4.9, "start": 0.1, "duration": 4.8},
    "script_segment": "segment_6",
    "content_preview": "Martha responds playfully to Gary's accusation",
    "narrative_purpose": "Martha's playful response to Gary's accusation"
  },
  {
    "chunk_id": "1750321862844-h02d4i95kg_chunk_1_0.0-0.0s",
    "shot_number": 7,
    "cut_reasoning": "Starts after initial pause, ends at natural boundary",
    "quality_notes": "Clear audio, curiosity tone",
    "precise_timing": {"end": 4.8, "start": 0.2, "duration": 4.6},
    "script_segment": "segment_7",
    "content_preview": "Gary's puzzled reaction to Martha's comments",
    "narrative_purpose": "Gary's puzzled reaction to Martha's comments"
  },
  {
    "chunk_id": "1750320059524-fr4vqppmt6j_chunk_1_0.0-0.0s",
    "shot_number": 8,
    "cut_reasoning": "Natural sentence boundary, captures smug tone",
    "quality_notes": "Clear audio, confident tone",
    "precise_timing": {"end": 4.9, "start": 0.1, "duration": 4.8},
    "script_segment": "segment_8",
    "content_preview": "Martha's confident statement about dinner plans",
    "narrative_purpose": "Martha's confident statement about dinner plans"
  },
  {
    "chunk_id": "1750322067412-mjl7k9lwl5p_chunk_1_0.0-0.0s",
    "shot_number": 9,
    "cut_reasoning": "Starts after initial pause, ends at natural boundary",
    "quality_notes": "Clear audio, realization tone",
    "precise_timing": {"end": 5.8, "start": 0.2, "duration": 5.6},
    "script_segment": "segment_9",
    "content_preview": "Gary's realization about Martha's intentions",
    "narrative_purpose": "Gary's realization about Martha's intentions"
  },
  {
    "chunk_id": "1750320481706-4fanyz5bdba_chunk_1_0.0-0.0s",
    "shot_number": 10,
    "cut_reasoning": "Natural sentence boundary, captures teasing tone",
    "quality_notes": "Clear audio, teasing tone",
    "precise_timing": {"end": 4.9, "start": 0.1, "duration": 4.8},
    "script_segment": "segment_10",
    "content_preview": "Martha's teasing response to Gary's realization",
    "narrative_purpose": "Martha's teasing response to Gary's realization"
  },
  {
    "chunk_id": "1750322368255-vf7iu40m19k_chunk_1_0.0-0.0s",
    "shot_number": 11,
    "cut_reasoning": "Starts after initial pause, ends at natural boundary",
    "quality_notes": "Clear audio, exasperated tone",
    "precise_timing": {"end": 3.8, "start": 0.2, "duration": 3.6},
    "script_segment": "segment_11",
    "content_preview": "Gary's plea for his keys",
    "narrative_purpose": "Gary's plea for his keys"
  },
  {
    "chunk_id": "1750320795744-u7erjizsl3s_chunk_1_0.0-0.0s",
    "shot_number": 12,
    "cut_reasoning": "Natural sentence boundary, captures triumphant tone",
    "quality_notes": "Clear audio, triumphant tone",
    "precise_timing": {"end": 4.9, "start": 0.1, "duration": 4.8},
    "script_segment": "segment_12",
    "content_preview": "Martha's victorious suggestion",
    "narrative_purpose": "Resolution with Martha's victorious suggestion"
  }
];