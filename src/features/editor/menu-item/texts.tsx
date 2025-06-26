import Draggable from '@/components/shared/draggable';
import { Button, buttonVariants } from '@/components/ui/button';
import { DEFAULT_FONT } from '@/features/editor/constants/font';
import { cn } from '@/lib/utils';
import { dispatch } from '@designcombo/events';
import { ADD_TEXT } from '@designcombo/state';
import { generateId } from '@designcombo/timeline';
import { useIsDraggingOverTimeline } from '../hooks/is-dragging-over-timeline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FiType, FiAlignCenter, FiAlignLeft, FiAlignRight } from 'react-icons/fi';

export const getAddTextPayload = () => ({
  id: generateId(),
  display: {
    from: 0,
    to: 5000,
  },
  type: 'text',
  details: {
    text: 'Heading and some body',
    fontSize: 120,
    width: 600,
    fontUrl: DEFAULT_FONT.url,
    fontFamily: DEFAULT_FONT.postScriptName,
    color: '#ffffff',
    wordWrap: 'break-word',
    textAlign: 'center',
    borderWidth: 0,
    borderColor: '#000000',
    boxShadow: {
      color: '#ffffff',
      x: 0,
      y: 0,
      blur: 0,
    },
  },
});

export const Texts = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const handleAddText = () => {
    dispatch(ADD_TEXT, {
      payload: getAddTextPayload(),
      options: {},
    });
  };

  const handleAddAlignedText = (alignment: string) => {
    const payload = getAddTextPayload();
    payload.details.textAlign = alignment;
    dispatch(ADD_TEXT, {
      payload,
      options: {},
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 flex-none items-center px-4 font-medium text-sm text-text-primary">
        Text
      </div>
      <ScrollArea className="h-[calc(100vh-58px-48px)]">
        <div className="flex flex-col gap-4 p-4 pb-20">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">Basic Text</h3>
            <Draggable
              data={getAddTextPayload}
              renderCustomPreview={
                <Button variant="secondary" className="w-60">
                  <FiType className="mr-2" /> Add text
                </Button>
              }
              shouldDisplayPreview={!isDraggingOverTimeline}
            >
              <div
                onClick={handleAddText}
                className={cn(buttonVariants({ variant: 'secondary' }), "w-full justify-start")}
              >
                <FiType className="mr-2" /> Add text
              </div>
            </Draggable>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">Aligned Text</h3>
            <div className="grid grid-cols-3 gap-2">
              <Draggable
                data={() => {
                  const payload = getAddTextPayload();
                  payload.details.textAlign = 'left';
                  return payload;
                }}
                renderCustomPreview={
                  <Button variant="outline" size="sm" className="w-full">
                    <FiAlignLeft />
                  </Button>
                }
                shouldDisplayPreview={!isDraggingOverTimeline}
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleAddAlignedText('left')}
                >
                  <FiAlignLeft />
                </Button>
              </Draggable>
              
              <Draggable
                data={() => {
                  const payload = getAddTextPayload();
                  payload.details.textAlign = 'center';
                  return payload;
                }}
                renderCustomPreview={
                  <Button variant="outline" size="sm" className="w-full">
                    <FiAlignCenter />
                  </Button>
                }
                shouldDisplayPreview={!isDraggingOverTimeline}
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleAddAlignedText('center')}
                >
                  <FiAlignCenter />
                </Button>
              </Draggable>
              
              <Draggable
                data={() => {
                  const payload = getAddTextPayload();
                  payload.details.textAlign = 'right';
                  return payload;
                }}
                renderCustomPreview={
                  <Button variant="outline" size="sm" className="w-full">
                    <FiAlignRight />
                  </Button>
                }
                shouldDisplayPreview={!isDraggingOverTimeline}
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleAddAlignedText('right')}
                >
                  <FiAlignRight />
                </Button>
              </Draggable>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};