"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import StateManager from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";
import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useUserVideos } from "@/hooks/use-user-videos";
import { useAuth } from "@/hooks/use-auth";
import { dispatch, subject, filter } from "@designcombo/events";
import { EDITOR_ADD_MULTIPLE_VIDEOS } from "./constants/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { useRouter } from "next/navigation";
import { loadShotListForTimeline, getLatestCompletedEDLJob } from "@/utils/shot-list-loader";

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

interface EditorProps {
  projectId?: string;
}

const Editor = ({ projectId }: EditorProps = {}) => {
  const [projectName, setProjectName] = useState<string>("Untitled video");
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const { timeline, playerRef } = useStore();
  const { user, loading } = useAuth();
  
  const { videos } = useUserVideos(projectId);
  const [shotlistLoaded, setShotlistLoaded] = useState(false);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Function to add videos using direct StateManager.updateState (ATOMIC - LIMITED INTERACTIVITY)
  const addVideosWithAtomicUpdate = async (videos: any[]) => {
    console.log('Adding videos with atomic update');
    
    // Wait for timeline to be ready before adding videos
    if (timeline) {
      await new Promise<void>((resolve) => {
        const checkTimelineReady = () => {
          try {
            // Check if timeline canvas is initialized and can accept objects
            if (timeline.getObjects && typeof timeline.requestRenderAll === 'function') {
              console.log('Timeline is ready for video loading');
              resolve();
            } else {
              console.log('Timeline not ready, waiting...');
              setTimeout(checkTimelineReady, 100);
            }
          } catch (error) {
            console.log('Timeline check error, retrying...', error);
            setTimeout(checkTimelineReady, 100);
          }
        };
        checkTimelineReady();
      });
    }
    
    const currentState = stateManager.getState();
    const videoItems: any[] = [];
    const videoItemsMap: Record<string, any> = {};
    const videoIds: string[] = [];
    let currentPosition = 0;

    // Pre-calculate all video items with correct positioning
    videos.forEach((video, index) => {
      // For shot list videos, use clip_duration if available, otherwise use duration
      const duration = video.clip_duration ? video.clip_duration * 1000 : 
                      video.duration ? video.duration * 1000 : 5000;
      const videoId = generateId();
      
      const videoItem = {
        id: videoId,
        name: `Video ${index + 1}: ${video.original_name}`,
        type: "video",
        display: {
          from: currentPosition,
          to: currentPosition + duration
        },
        duration: duration,
        details: {
          src: convertS3UrlToHttps(video.s3_location),
          width: 1080,
          height: 1920,
          volume: 1,
        },
        metadata: {
          previewUrl: video.thumbnail_url || convertS3UrlToHttps(video.s3_location),
          filename: video.original_name,
          shotNumber: video.shot_number,
          chunkId: video.chunk_id,
          contentPreview: video.content_preview,
          narrativePurpose: video.narrative_purpose,
        },
        trim: {
          from: video.start_time ? video.start_time * 1000 : 0,
          to: video.end_time ? video.end_time * 1000 : duration,
        },
        playbackRate: 1,
      };
      
      videoItems.push(videoItem);
      videoItemsMap[videoId] = videoItem;
      videoIds.push(videoId);
      currentPosition += duration;
      
      console.log(`Pre-calculated video ${index + 1}: ${videoItem.display.from}ms - ${videoItem.display.to}ms`);
    });

    // Find or create main track
    let mainTrack = currentState.tracks.find(track => track.id === "main");
    let updatedTracks = [...currentState.tracks];
    
    if (mainTrack) {
      // Update existing main track
      updatedTracks = currentState.tracks.map(track => 
        track.id === "main" 
          ? { ...track, items: [...track.items, ...videoIds] }
          : track
      );
    } else {
      // Create main track if it doesn't exist
      updatedTracks.push({
        id: "main",
        type: "main",
        items: videoIds,
        accepts: ["video", "image"],
        index: 0,
      });
    }

    // Create final state update with all videos
    const finalState = {
      tracks: updatedTracks,
      trackItemsMap: { ...currentState.trackItemsMap, ...videoItemsMap },
      trackItemIds: [...currentState.trackItemIds, ...videoIds],
      trackItemDetailsMap: { ...currentState.trackItemDetailsMap, ...videoItemsMap },
      duration: Math.max(currentState.duration, currentPosition),
    };

    console.log('Final state update:', finalState);

    // Single atomic state update - this is the KEY!
    stateManager.updateState(finalState, { 
      updateHistory: true, 
      kind: "add" 
    });
    
    console.log(`Successfully added ${videos.length} videos atomically`);
    
    // Force timeline to re-render and ensure objects are interactive
    if (timeline) {
      setTimeout(() => {
        try {
          timeline.requestRenderAll();
          console.log('Timeline re-render requested after atomic update');
        } catch (error) {
          console.log('Timeline re-render failed:', error);
        }
      }, 100);
    }
  };

  // Convert S3 URL if needed
  const convertS3UrlToHttps = (s3Location: string | null | undefined): string => {
    if (!s3Location) return '';
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

  // Function to load shot list from EDL generation job
  const loadShotListFromEDL = async (jobId?: string) => {
    if (!projectId) {
      console.error('No project ID available for shot list loading');
      return;
    }

    try {
      let targetJobId = jobId;
      
      // If no specific job ID provided, get the latest completed EDL job
      if (!targetJobId) {
        console.log('No job ID provided, finding latest completed EDL job...');
        const latestJob = await getLatestCompletedEDLJob(projectId);
        
        if (!latestJob.success) {
          console.error('No completed EDL jobs found:', latestJob.error);
          return;
        }
        
        targetJobId = latestJob.jobId;
        console.log('Found latest completed EDL job:', targetJobId);
      }

      console.log(`Loading shot list from EDL job: ${targetJobId}`);
      
      // Load the shot list from the database
      const result = await loadShotListForTimeline(targetJobId!);
      
      if (!result.success) {
        console.error('Failed to load shot list:', result.error);
        return;
      }

      if (result.videos.length === 0) {
        console.log('No shots found in the EDL job');
        return;
      }

      console.log(`Loading ${result.videos.length} shots from EDL job`);

      // Convert shot list videos to the expected format for the timeline
      const timelineVideos = result.videos.map((video, index) => ({
        id: video.id,
        original_name: video.original_name,
        file_name: video.file_name,
        s3_location: video.s3_location,
        duration: video.duration,
        // Use shot-specific timing if available
        start_time: video.start_time,
        end_time: video.end_time,
        shot_number: video.shot_number,
        chunk_id: video.chunk_id,
        content_preview: video.content_preview,
        narrative_purpose: video.narrative_purpose,
        // Calculate precise duration for timeline positioning
        clip_duration: video.end_time && video.start_time ? 
          (video.end_time - video.start_time) : 
          5.0 // fallback duration
      }));

      console.log('Converted shots for timeline:', timelineVideos.length);

      // Load using the atomic update function with shot-specific durations
      await addVideosWithAtomicUpdate(timelineVideos);
      
      setShotlistLoaded(true);
      console.log(`✅ Successfully loaded ${result.videos.length} shots from EDL job ${targetJobId}`);
      console.log(`Total duration: ${result.totalDuration}s`);

    } catch (error) {
      console.error('Error loading shot list from EDL:', error);
    }
  };

  // Listen for the add multiple videos event
  useEffect(() => {
    const subscription = subject
      .pipe(filter(({ key }) => key === EDITOR_ADD_MULTIPLE_VIDEOS))
      .subscribe((event) => {
        const { payload } = event.value || {};
        if (payload && Array.isArray(payload)) {
          // Use sequential dispatch for better compatibility
          payload.forEach((videoItem) => {
            dispatch(ADD_VIDEO, {
              payload: videoItem,
              options: {
                resourceId: "main",
                scaleMode: "fit",
              },
            });
          });
          setShotlistLoaded(true);
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();

  // Make functions available globally for testing
  useEffect(() => {
    (window as any).addVideosWithAtomicUpdate = addVideosWithAtomicUpdate;
    (window as any).loadShotListFromEDL = loadShotListFromEDL;
    return () => {
      delete (window as any).addVideosWithAtomicUpdate;
      delete (window as any).loadShotListFromEDL;
    };
  }, [videos, projectId]); // Re-register when videos or projectId change

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    loadFonts([
      {
        name: SECONDARY_FONT,
        url: SECONDARY_FONT_URL,
      },
    ]);
  }, []);

  useEffect(() => {
    const screenHeight = window.innerHeight;
    const desiredHeight = 300;
    const percentage = (desiredHeight / screenHeight) * 100;
    timelinePanelRef.current?.resize(percentage);
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    timeline?.resize(
      {
        height: timelineContainer.clientHeight - 90,
        width: timelineContainer.clientWidth - 40,
      },
      {
        force: true,
      },
    );
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  // If loading or not logged in, show loading or nothing
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <Navbar
        projectName={projectName}
        user={user}
        stateManager={stateManager}
        setProjectName={setProjectName}
        projectId={projectId}
        onLoadShotList={loadShotListFromEDL}
      />
      <div className="flex flex-1">
        <ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
          <ResizablePanel className="relative" defaultSize={70}>
            <FloatingControl />
            <div className="flex h-full flex-1">
              <div className="bg-sidebar flex flex-none border-r border-border/80">
                <MenuList />
                <MenuItem videos={videos} />
              </div>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <CropModal />
                <Scene stateManager={stateManager} />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            className="min-h-[50px]"
            ref={timelinePanelRef}
            defaultSize={30}
            onResize={handleTimelineResize}
          >
            {playerRef && <Timeline stateManager={stateManager} />}
          </ResizablePanel>
        </ResizablePanelGroup>
        <ControlItem />
      </div>
    </div>
  );
};

export default Editor;