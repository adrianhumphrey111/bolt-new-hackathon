import { createClient } from '@supabase/supabase-js';

// Shot list item type from database
interface ShotListItem {
  shot_id: string;
  shot_number: number;
  video_id: string;
  chunk_id: string;
  file_name: string;
  file_path: string;
  s3_location: string;
  start_time: number;
  end_time: number;
  duration: number;
  timeline_start: number;
  timeline_order: number;
  content_preview?: string;
  narrative_purpose?: string;
  match_type?: string;
  match_confidence?: number;
  video_original_name: string;
  video_total_duration: number;
}

// Timeline video format expected by the editor
interface TimelineVideo {
  id: string;
  original_name: string;
  file_name: string;
  s3_location: string;
  duration: number;
  start_time?: number;
  end_time?: number;
  timeline_start?: number;
  shot_number?: number;
  chunk_id?: string;
  content_preview?: string;
  narrative_purpose?: string;
}

/**
 * Load shot list from EDL generation job and convert to timeline format
 */
export async function loadShotListForTimeline(jobId: string): Promise<{
  success: boolean;
  videos: TimelineVideo[];
  error?: string;
  totalDuration?: number;
  shotCount?: number;
}> {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Call the database function to get shot list with video details
    const { data: shotList, error } = await supabase
      .rpc('get_shot_list_for_timeline', { job_id_param: jobId })
      .returns<ShotListItem[]>();

    if (error) {
      console.error('Error loading shot list:', error);
      return {
        success: false,
        videos: [],
        error: `Failed to load shot list: ${error.message}`
      };
    }

    if (!shotList || shotList.length === 0) {
      return {
        success: false,
        videos: [],
        error: 'No shots found for this EDL job'
      };
    }

    // Convert shot list items to timeline video format
    const timelineVideos: TimelineVideo[] = shotList.map((shot) => ({
      id: shot.video_id,
      original_name: shot.video_original_name,
      file_name: shot.file_name,
      s3_location: shot.s3_location,
      duration: shot.video_total_duration,
      start_time: shot.start_time,
      end_time: shot.end_time,
      timeline_start: shot.timeline_start,
      shot_number: shot.shot_number,
      chunk_id: shot.chunk_id,
      content_preview: shot.content_preview,
      narrative_purpose: shot.narrative_purpose
    }));

    // Calculate total duration
    const totalDuration = shotList.reduce((sum, shot) => sum + shot.duration, 0);

    console.log(`✅ Loaded ${shotList.length} shots with total duration ${totalDuration}s`);

    return {
      success: true,
      videos: timelineVideos,
      totalDuration: totalDuration,
      shotCount: shotList.length
    };

  } catch (error) {
    console.error('Error in loadShotListForTimeline:', error);
    return {
      success: false,
      videos: [],
      error: error instanceof Error ? error.message : 'Unknown error loading shot list'
    };
  }
}

/**
 * Get the latest completed EDL job for a project
 */
export async function getLatestCompletedEDLJob(projectId: string): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: jobs, error } = await supabase
      .from('edl_generation_jobs')
      .select('id, status, completed_at, shot_list')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .not('shot_list', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting latest EDL job:', error);
      return {
        success: false,
        error: `Failed to get EDL job: ${error.message}`
      };
    }

    if (!jobs || jobs.length === 0) {
      return {
        success: false,
        error: 'No completed EDL jobs found for this project'
      };
    }

    return {
      success: true,
      jobId: jobs[0].id
    };

  } catch (error) {
    console.error('Error in getLatestCompletedEDLJob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting EDL job'
    };
  }
}

/**
 * Check if an EDL job has completed successfully and has shot list items
 */
export async function checkEDLJobStatus(jobId: string): Promise<{
  success: boolean;
  status: string;
  hasShots: boolean;
  shotCount: number;
  error?: string;
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('edl_generation_jobs')
      .select('id, status, shot_list')
      .eq('id', jobId)
      .single();

    if (jobError) {
      return {
        success: false,
        status: 'error',
        hasShots: false,
        shotCount: 0,
        error: jobError.message
      };
    }

    // Count shot list items
    const { count, error: countError } = await supabase
      .from('shot_list_items')
      .select('*', { count: 'exact', head: true })
      .eq('edl_generation_job_id', jobId);

    if (countError) {
      console.warn('Error counting shots:', countError);
    }

    const shotCount = count || 0;
    const hasShots = shotCount > 0;

    return {
      success: true,
      status: job.status,
      hasShots,
      shotCount
    };

  } catch (error) {
    console.error('Error checking EDL job status:', error);
    return {
      success: false,
      status: 'error',
      hasShots: false,
      shotCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}