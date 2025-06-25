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
import { loadShotlistToTimeline, testShotlist } from "./utils/load-shotlist";
import { useUserVideos } from "@/hooks/use-user-videos";
import { useAuth } from "@/hooks/use-auth";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

const Editor = () => {
  const [projectName, setProjectName] = useState<string>("Untitled video");
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const { timeline, playerRef } = useStore();
  const { user } = useAuth();
  const { videos } = useUserVideos();
  const [shotlistLoaded, setShotlistLoaded] = useState(false);


  // Function to add videos using direct StateManager.updateState (ATOMIC - LIMITED INTERACTIVITY)
  const addVideosWithAtomicUpdate = async (videos: any[]) => {
    console.log('Adding videos with atomic state update');
    
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
      const duration = video.duration ? video.duration * 1000 : 5000;
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
        },
        trim: {
          from: 0,
          to: duration,
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

  // CORRECTED APPROACH: Use dispatch(ADD_VIDEO) like drag-and-drop does
  const addVideosWithDispatch = async (videos: any[]) => {
    console.log('Adding videos with dispatch - CORRECTED APPROACH');
    
    if (videos.length === 0) {
      console.warn('No videos available to add');
      return;
    }

    // Wait for timeline to be ready
    if (timeline) {
      await new Promise<void>((resolve) => {
        const checkTimelineReady = () => {
          try {
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

    let currentPosition = 0;
    
    // Add videos one by one using dispatch, like drag-and-drop does
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const duration = video.duration ? video.duration * 1000 : 5000;
      
      const videoPayload = {
        id: generateId(),
        type: "video",
        details: {
          src: convertS3UrlToHttps(video.s3_location),
          width: 1080,
          height: 1920,
          volume: 1,
        },
        metadata: {
          previewUrl: video.thumbnail_url || convertS3UrlToHttps(video.s3_location),
          filename: video.original_name,
        },
        duration: duration,
        // Set positioning manually for sequential layout
        display: {
          from: currentPosition,
          to: currentPosition + duration
        },
        trim: {
          from: 0,
          to: duration,
        },
        playbackRate: 1,
      };

      console.log(`Dispatching ADD_VIDEO for video ${i + 1}: ${videoPayload.display.from}ms - ${videoPayload.display.to}ms`);
      
      // Use the same dispatch mechanism as drag-and-drop
      dispatch(ADD_VIDEO, {
        payload: videoPayload,
        options: {
          resourceId: "main",
          scaleMode: "fit",
        },
      });

      currentPosition += duration;
      
      // Small delay to prevent overwhelming the event system
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Successfully dispatched ${videos.length} videos using ADD_VIDEO events`);
  };

  // Test function using corrected dispatch approach
  const testAddOneVideo = async () => {
    console.log('testAddOneVideo called - using dispatch approach');
    console.log('Available videos:', videos);
    
    if (videos.length === 0) {
      console.warn('No videos available to add');
      return;
    }

    // Get up to 3 videos
    const videosToAdd = videos.slice(0, 3);
    console.log(`Adding ${videosToAdd.length} videos with dispatch approach`);

    try {
      // Use the corrected dispatch approach
      await addVideosWithDispatch(videosToAdd);
      
    } catch (error) {
      console.error('Error in testAddOneVideo:', error);
    }
  };

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();

  // Make functions available globally for testing
  useEffect(() => {
    (window as any).testAddOneVideo = testAddOneVideo;
    (window as any).addVideosWithAtomicUpdate = addVideosWithAtomicUpdate;
    (window as any).addVideosWithDispatch = addVideosWithDispatch;
    return () => {
      delete (window as any).testAddOneVideo;
      delete (window as any).addVideosWithAtomicUpdate;
      delete (window as any).addVideosWithDispatch;
    };
  }, [videos]); // Re-register when videos change

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

  // Test: Run testAddOneVideo on page load
  useEffect(() => {
    console.log('Auto-load test check:', {
      user: !!user,
      videosLength: videos.length,
      shotlistLoaded,
      timeline: !!timeline
    });
    
    // Run test function only once when conditions are met
    if (user && videos.length > 0 && timeline && !shotlistLoaded) {
      console.log('Auto-running testAddOneVideo with', videos.length, 'available videos');
      testAddOneVideo().then(() => {
        setShotlistLoaded(true);
      }).catch(error => {
        console.error('Error in auto-load:', error);
        setShotlistLoaded(true); // Still mark as loaded to prevent retry
      });
    }
  }, [user, videos, timeline, shotlistLoaded]);

  // Load shotlist when user videos are available - COMMENTED OUT FOR DEBUGGING
  // useEffect(() => {
  //   console.log('Shotlist loading check:', {
  //     user: !!user,
  //     videosLength: videos.length,
  //     shotlistLoaded,
  //     timeline: !!timeline
  //   });
  //   
  //   // Load shotlist only once when conditions are met
  //   if (user && videos.length > 0 && timeline && !shotlistLoaded) {
  //     console.log('Loading shotlist with', videos.length, 'available videos');
  //     console.log('Available videos:', videos);
  //     loadShotlistToTimeline(testShotlist, videos);
  //     setShotlistLoaded(true);
  //   }
  // }, [user, videos, timeline]);

  return (
    <div className="flex h-screen w-screen flex-col">
      <Navbar
        projectName={projectName}
        user={null}
        stateManager={stateManager}
        setProjectName={setProjectName}
      />
      <div className="flex flex-1">
        <ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
          <ResizablePanel className="relative" defaultSize={70}>
            <FloatingControl />
            <div className="flex h-full flex-1">
              <div className="bg-sidebar flex flex-none border-r border-border/80">
                <MenuList />
                <MenuItem />
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