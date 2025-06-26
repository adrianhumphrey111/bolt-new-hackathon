import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import React, { useState, useEffect } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiUpload, FiVideo, FiPlayCircle } from "react-icons/fi";

interface UserVideo {
  id: string
  file_name: string
  original_name: string
  s3_location: string
  thumbnail_url?: string
  duration?: number
  created_at: string
  project_id: string
}

interface VideosProps {
  videos: UserVideo[]
}

export const Videos = ({ videos }: VideosProps) => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const { user } = useAuth();
  const loading = false;
  const error = null;

  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  const handleAddVideo = (payload: Partial<IVideo>) => {
    dispatch(ADD_VIDEO, {
      payload,
      options: {
        resourceId: "main",
        scaleMode: "fit",
      },
    });
  };

  const convertS3UrlToHttps = (s3Location: string | null | undefined): string => {
    // Handle null/undefined values
    if (!s3Location) {
      console.warn('s3Location is null or undefined');
      return '';
    }
    
    // Convert s3://bucket/key to https://bucket.s3.region.amazonaws.com/key
    if (s3Location.startsWith('s3://')) {
      const s3Match = s3Location.match(/^s3:\/\/([^\/]+)\/(.+)$/);
      if (s3Match) {
        const [, bucket, key] = s3Match;
        // Use the region from environment or default to us-east-1
        const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      }
    }
    // If already HTTPS URL, return as is
    return s3Location;
  };

  useEffect(() => {
    // Convert S3 URLs to HTTPS URLs (since videos are public)
    const generateUrls = () => {
      if (videos.length === 0) return;
      
      const urls: Record<string, string> = {};
      
      for (const video of videos) {
        if (video.s3_location) {
          urls[video.id] = convertS3UrlToHttps(video.s3_location);
        }
      }
      
      setVideoUrls(urls);
    };

    generateUrls();
  }, [videos]);

  if (!user) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
          Videos
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Sign in to access your videos
            </p>
            <Link href="/auth/login">
              <Button size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
          Videos
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
          Videos
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm text-red-500 mb-4">
              Error loading videos: {error}
            </p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
          Videos
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 gap-4">
          <FiUpload className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              No videos found. Upload some videos to get started.
            </p>
            <Link href="/dashboard">
              <Button size="sm">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Your Videos ({videos.length})
      </div>
      <ScrollArea className="h-[calc(100vh-58px-48px)]">
        <div className="grid grid-cols-2 gap-3 p-4 pb-20">
          {videos.map((video) => {
            const signedUrl = videoUrls[video.id] || video.s3_location;
            const videoData: Partial<IVideo> = {
              id: generateId(),
              details: {
                src: signedUrl,
                width: 1080, // Default width for proper scaling
                height: 1920, // Default height for proper scaling
                volume: 1,
              },
              type: "video",
              metadata: {
                previewUrl: video.thumbnail_url || signedUrl,
                filename: video.original_name,
              },
              duration: video.duration || 10000, // Default duration if not available
            };

            return (
              <UserVideoItem
                key={video.id}
                video={videoData}
                userVideo={video}
                signedUrl={signedUrl}
                shouldDisplayPreview={!isDraggingOverTimeline}
                handleAddVideo={handleAddVideo}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

interface UserVideoProps {
  handleAddVideo: (payload: Partial<IVideo>) => void;
  video: Partial<IVideo>;
  userVideo: any;
  signedUrl: string;
  shouldDisplayPreview: boolean;
}

const UserVideoItem = ({
  handleAddVideo,
  video,
  userVideo,
  signedUrl,
  shouldDisplayPreview,
}: UserVideoProps) => {
  const previewUrl = video.metadata?.previewUrl || video.details?.src;
  
  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${previewUrl})`,
      backgroundSize: "cover",
      width: "80px",
      height: "80px",
    }),
    [previewUrl],
  );

  return (
    <div className="mb-2">
      <Draggable
        data={{
          ...video,
          metadata: {
            previewUrl,
            filename: userVideo.original_name,
          },
        }}
        renderCustomPreview={<div style={style} className="draggable" />}
        shouldDisplayPreview={shouldDisplayPreview}
      >
        <div
          onClick={() => handleAddVideo(video)}
          className="flex w-full flex-col items-center justify-center overflow-hidden bg-background cursor-pointer group"
        >
          <div className="relative w-full">
            {userVideo.thumbnail_url ? (
              <img
                src={userVideo.thumbnail_url}
                alt={userVideo.original_name}
                className="h-24 w-full rounded-md object-cover"
              />
            ) : (
              <video
                className="h-24 w-full rounded-md object-cover"
                muted
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  video.currentTime = 1; // Show frame at 1 second
                }}
              >
                <source src={signedUrl} type="video/mp4" />
              </video>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-md flex items-center justify-center">
              <div className="bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiPlayCircle className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>
          <div className="w-full mt-1">
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={userVideo.original_name}>
              {userVideo.original_name}
            </p>
            {userVideo.duration && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <FiClock className="inline mr-1" size={10} />
                {Math.floor(userVideo.duration / 60)}:{(userVideo.duration % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>
        </div>
      </Draggable>
    </div>
  );
};

// Add missing FiClock import
import { FiClock } from "react-icons/fi";