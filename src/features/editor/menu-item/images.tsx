import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IMAGES } from "../data/images";
import { dispatch } from "@designcombo/events";
import { ADD_ITEMS } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IImage } from "@designcombo/types";
import React from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { FiImage } from "react-icons/fi";

export const Images = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const handleAddImage = (payload: Partial<IImage>) => {
    const id = generateId();
    dispatch(ADD_ITEMS, {
      payload: {
        trackItems: [
          {
            id,
            type: "image",
            display: {
              from: 0,
              to: 5000,
            },
            details: {
              src: payload.details!.src,
            },
            metadata: {},
          },
        ],
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Photos
      </div>
      <ScrollArea className="h-[calc(100vh-58px-48px)]">
        <div className="grid grid-cols-2 gap-3 p-4 pb-20">
          {IMAGES.length > 0 ? (
            IMAGES.map((image, index) => {
              return (
                <ImageItem
                  key={index}
                  image={image}
                  shouldDisplayPreview={!isDraggingOverTimeline}
                  handleAddImage={handleAddImage}
                />
              );
            })
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center">
              <FiImage className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No images available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const ImageItem = ({
  handleAddImage,
  image,
  shouldDisplayPreview,
}: {
  handleAddImage: (payload: Partial<IImage>) => void;
  image: Partial<IImage>;
  shouldDisplayPreview: boolean;
}) => {
  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${image.preview})`,
      backgroundSize: "cover",
      width: "80px",
      height: "80px",
    }),
    [image.preview],
  );

  return (
    <Draggable
      data={image}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() =>
          handleAddImage({
            id: generateId(),
            details: {
              src: image.details!.src,
            },
          } as IImage)
        }
        className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden bg-background pb-2"
      >
        <img
          draggable={false}
          src={image.preview}
          className="h-full w-full rounded-md object-cover"
          alt="image"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
          <div className="rounded-full bg-white/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <FiImage className="h-5 w-5 text-gray-700" />
          </div>
        </div>
      </div>
    </Draggable>
  );
};