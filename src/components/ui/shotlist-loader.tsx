import { Button } from "@/components/ui/button";
import { useShotlist } from "@/hooks/use-shotlist";
import { useUserVideos } from "@/hooks/use-user-videos";
import { transformShotlistToTimelineItems } from "@/utils/shotlist-transformer";
import { dispatch } from "@designcombo/events";
import { EDITOR_ADD_MULTIPLE_VIDEOS } from "@/features/editor/constants/events";
import { useState } from "react";

interface ShotlistLoaderProps {
  projectId?: string;
  onComplete?: () => void;
}

export function ShotlistLoader({ projectId, onComplete }: ShotlistLoaderProps) {
  const { shotlist, loading: shotlistLoading, error: shotlistError } = useShotlist(projectId);
  const { videos, loading: videosLoading } = useUserVideos();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLoadShotlist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      
      if (!shotlist.length) {
        setError("No shotlist available to load");
        return;
      }
      
      if (!videos.length) {
        setError("No videos available to match with shotlist");
        return;
      }
      
      // Transform shotlist to timeline items
      const timelineItems = transformShotlistToTimelineItems(shotlist, videos);
      
      if (!timelineItems.length) {
        setError("Could not match any shotlist items with available videos");
        return;
      }
      
      console.log(`Loading ${timelineItems.length} shots to timeline`);
      
      // Dispatch event to add multiple videos atomically
      dispatch(EDITOR_ADD_MULTIPLE_VIDEOS, {
        payload: timelineItems,
        options: {
          resourceId: "main",
          scaleMode: "fit",
        },
      });
      
      setSuccess(true);
      onComplete?.();
      
    } catch (err) {
      console.error("Error loading shotlist:", err);
      setError("Failed to load shotlist to timeline");
    } finally {
      setIsLoading(false);
    }
  };

  if (shotlistLoading || videosLoading) {
    return (
      <Button disabled variant="outline">
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
        Loading...
      </Button>
    );
  }

  if (shotlistError) {
    return (
      <Button variant="destructive" disabled>
        Error loading shotlist
      </Button>
    );
  }

  if (!shotlist.length) {
    return (
      <Button variant="outline" disabled>
        No shotlist available
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={handleLoadShotlist} 
        disabled={isLoading || !videos.length}
        variant={success ? "default" : "outline"}
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
            Loading Shotlist...
          </>
        ) : success ? (
          "Shotlist Loaded ✓"
        ) : (
          `Load Shotlist (${shotlist.length} shots)`
        )}
      </Button>
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      
      {!videos.length && (
        <p className="text-xs text-muted-foreground">No videos available to match with shotlist</p>
      )}
    </div>
  );
}