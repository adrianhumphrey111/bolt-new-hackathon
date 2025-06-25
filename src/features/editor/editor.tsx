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
import { useShotlist } from "@/hooks/use-shotlist";
import { transformShotlistToTimelineItems } from "@/utils/shotlist-transformer";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, CLEAR_TIMELINE } from "@designcombo/state";

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
  const { shotlist } = useShotlist();
  const [shotlistLoaded, setShotlistLoaded] = useState(false);

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();

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

  // Auto-load shotlist when conditions are met
  useEffect(() => {
    const loadShotlistToTimeline = async () => {
      if (!user || !videos.length || !shotlist.length || !timeline || shotlistLoaded) {
        return;
      }

      try {
        console.log(`Loading shotlist with ${shotlist.length} shots and ${videos.length} videos`);
        
        // Clear timeline first
        dispatch(CLEAR_TIMELINE, {});
        
        // Transform shotlist to timeline items
        const timelineItems = transformShotlistToTimelineItems(shotlist, videos);
        
        if (timelineItems.length === 0) {
          console.warn('No matching videos found for shotlist items');
          return;
        }
        
        console.log(`Adding ${timelineItems.length} videos to timeline`);
        
        // Add each video to the timeline with a small delay to prevent overwhelming the event system
        for (const item of timelineItems) {
          dispatch(ADD_VIDEO, {
            payload: item,
            options: {
              resourceId: "main",
              scaleMode: "fit",
            },
          });
          
          // Small delay between each dispatch
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setShotlistLoaded(true);
        console.log('Shotlist loaded successfully');
      } catch (error) {
        console.error('Error loading shotlist:', error);
      }
    };

    loadShotlistToTimeline();
  }, [user, videos, shotlist, timeline, shotlistLoaded]);

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