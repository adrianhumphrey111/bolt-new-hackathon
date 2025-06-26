import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import useDataState from "../../store/use-data-state";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import Opacity from "./opacity";
import { Input } from "@/components/ui/input";
import { ITrackItem } from "@designcombo/types";
import { Label } from "@/components/ui/label";
import ColorPicker from "@/components/color-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ICompactFont, IFont } from "../../interfaces/editor";
import Draggable from "react-draggable";
import useLayoutStore from "../../store/use-layout-store";
import { FiAlignCenter, FiAlignLeft, FiAlignRight, FiUnderline, FiType } from "react-icons/fi";
import { RxStrikethrough, RxOverline } from "react-icons/rx";

interface TextControlsProps {
  trackItem: ITrackItem & any;
  properties: any;
  selectedFont: ICompactFont;
  onChangeFontFamily: (font: ICompactFont) => void;
  handleChangeFontStyle: (font: IFont) => void;
  onChangeFontSize: (v: number) => void;
  handleColorChange: (color: string) => void;
  handleBackgroundChange: (color: string) => void;
  onChangeTextAlign: (v: string) => void;
  onChangeTextDecoration: (v: string) => void;
  handleChangeOpacity: (v: number) => void;
}

export const TextControls = ({
  trackItem,
  properties,
  selectedFont,
  onChangeFontFamily,
  handleChangeFontStyle,
  onChangeFontSize,
  handleColorChange,
  handleBackgroundChange,
  onChangeTextAlign,
  onChangeTextDecoration,
  handleChangeOpacity,
}: TextControlsProps) => {
  return (
    <div className="flex flex-col gap-2 py-4">
      <Label className="font-sans text-xs font-semibold text-primary">
        Styles
      </Label>
      <FontFamily
        handleChangeFont={onChangeFontFamily}
        fontFamilyDisplay={properties.fontFamilyDisplay}
      />

      <FontStyle
        selectedFont={selectedFont}
        handleChangeFontStyle={handleChangeFontStyle}
      />
      <FontSize value={properties.fontSize} onChange={onChangeFontSize} />
      <FontColor
        value={properties.color}
        handleColorChange={handleColorChange}
      />
      <FontBackground
        value={properties.backgroundColor}
        handleColorChange={handleBackgroundChange}
      />
      <Alignment value={properties.textAlign} onChange={onChangeTextAlign} />
      <TextDecoration
        value={properties.textDecoration}
        onChange={onChangeTextDecoration}
      />
      <FontCase id={trackItem.id} />

      <Opacity
        onChange={(v: number) => handleChangeOpacity(v)}
        value={properties.opacity!}
      />
    </div>
  );
};

const FontBackground = ({
  value,
  handleColorChange,
}: {
  value: string;
  handleColorChange: (color: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Fill
      </div>
      <div className="relative w-32">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <div
                style={{ background: localValue || "#ffffff" }}
                className="absolute left-0.5 top-0.5 h-7 w-7 flex-none cursor-pointer rounded-md border border-border"
              ></div>

              <Input
                variant="secondary"
                className="pointer-events-none h-8 pl-10"
                value={localValue}
                onChange={() => {}}
              />
            </div>
          </PopoverTrigger>

          <Draggable handle=".drag-handle">
            <PopoverContent className="absolute bottom-[-15rem] right-[460px] z-[300] w-full p-0">
              <div className="drag-handle flex w-[266px] cursor-grab justify-between rounded-t-lg bg-popover px-4 pt-4">
                <p className="text-sm font-bold">Fill</p>
                <div
                  className="h-4 w-4"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  <X className="h-4 w-4 cursor-pointer font-extrabold text-muted-foreground" />
                </div>
              </div>
              <ColorPicker
                value={localValue}
                format="hex"
                gradient={true}
                solid={true}
                onChange={(v: string) => {
                  setLocalValue(v);
                  handleColorChange(v);
                }}
                allowAddGradientStops={true}
              />
            </PopoverContent>
          </Draggable>
        </Popover>
      </div>
    </div>
  );
};
const FontColor = ({
  value,
  handleColorChange,
}: {
  value: string;
  handleColorChange: (color: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Color
      </div>
      <div className="relative w-32">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <div
                style={{ background: localValue || "#ffffff" }}
                className="absolute left-0.5 top-0.5 h-7 w-7 flex-none cursor-pointer rounded-md border border-border"
              ></div>

              <Input
                variant="secondary"
                className="pointer-events-none h-8 pl-10"
                value={localValue}
                onChange={() => {}}
              />
            </div>
          </PopoverTrigger>
          <Draggable handle=".drag-handle">
            <PopoverContent className="absolute bottom-[-15rem] right-[460px] z-[300] w-full p-0">
              <div className="drag-handle flex w-[266px] cursor-grab justify-between rounded-t-lg bg-popover px-4 pt-4">
                <p className="text-sm font-bold">Color</p>
                <div
                  className="h-4 w-4"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  <X className="h-4 w-4 cursor-pointer font-extrabold text-muted-foreground" />
                </div>
              </div>
              <ColorPicker
                value={localValue}
                format="hex"
                gradient={true}
                solid={true}
                onChange={(v: string) => {
                  setLocalValue(v);
                  handleColorChange(v);
                }}
                allowAddGradientStops={true}
              />
            </PopoverContent>
          </Draggable>
        </Popover>
      </div>
    </div>
  );
};

const FontSize = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== "") {
      onChange(Number(localValue)); // Propagate as a number
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (localValue !== "") {
        onChange(Number(localValue)); // Propagate as a number
      }
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Size
      </div>
      <div className="relative w-32">
        <Input
          variant="secondary"
          className="h-8"
          value={localValue}
          onChange={(e) => {
            const newValue = e.target.value;

            // Allow empty string or validate as a number
            if (
              newValue === "" ||
              (!isNaN(Number(newValue)) && Number(newValue) >= 0)
            ) {
              setLocalValue(newValue); // Update local state
            }
          }}
          onBlur={handleBlur} // Trigger onBlur event
          onKeyDown={handleKeyDown} // Trigger onKeyDown event
        />
      </div>
    </div>
  );
};

const FontFamily = ({
  handleChangeFont,
  fontFamilyDisplay,
}: {
  handleChangeFont: (font: ICompactFont) => void;
  fontFamilyDisplay: string;
}) => {
  const { setFloatingControl } = useLayoutStore();
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Font
      </div>
      <div className="relative w-32">
        <Button
          className="flex h-8 w-full items-center justify-between text-sm"
          variant="secondary"
          onClick={() => setFloatingControl("font-family-picker")}
        >
          <div className="w-full text-left">
            <p className="truncate">{fontFamilyDisplay}</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </div>
    </div>
  );
};
const FontStyle = ({
  selectedFont,
  handleChangeFontStyle,
}: {
  selectedFont: ICompactFont;
  handleChangeFontStyle: (font: IFont) => void;
}) => {
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Weight
      </div>
      <div className="relative w-32">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="flex h-8 w-full items-center justify-between text-sm"
              variant="secondary"
            >
              <div className="w-full overflow-hidden text-left">
                <p className="truncate"> {selectedFont.name}</p>
              </div>
              <ChevronDown className="text-muted-foreground" size={14} />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="z-[300] w-28 p-0">
            {selectedFont.styles.map((style, index) => {
              const fontFamilyEnd = style.postScriptName.lastIndexOf("-");
              const styleName = style.postScriptName
                .substring(fontFamilyEnd + 1)
                .replace("Italic", " Italic");
              return (
                <div
                  className="flex h-6 cursor-pointer items-center px-2 py-3.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  key={index}
                  onClick={() => handleChangeFontStyle(style)}
                >
                  {styleName}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const TextDecoration = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Decoration
      </div>
      <div className="flex gap-2">
        <div className="relative w-32">
          <ToggleGroup
            value={localValue.split(" ")}
            size="sm"
            className="grid grid-cols-3"
            type="multiple"
            onValueChange={(v) =>
              onChange(v.filter((v) => v !== "none").join(" "))
            }
            variant={"secondary"}
          >
            <ToggleGroupItem
              size="sm"
              value="underline"
              aria-label="Toggle left"
            >
              <FiUnderline size={18} />
            </ToggleGroupItem>
            <ToggleGroupItem value="line-through" aria-label="Toggle italic">
              <RxStrikethrough size={18} />
            </ToggleGroupItem>
            <ToggleGroupItem value="overline" aria-label="Toggle strikethrough">
              <RxOverline size={18} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
};

const fontAlignmentOptions = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const Alignment = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Align
      </div>
      <div className="flex gap-2">
        <div className="relative w-32">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="flex h-8 w-full items-center justify-between text-sm"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left flex items-center">
                  {localValue === "left" && <FiAlignLeft className="mr-2" size={14} />}
                  {localValue === "center" && <FiAlignCenter className="mr-2" size={14} />}
                  {localValue === "right" && <FiAlignRight className="mr-2" size={14} />}
                  <p className="truncate">{localValue}</p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="z-[300] w-32 p-0 py-1">
              {fontAlignmentOptions.map((option, index) => {
                return (
                  <div
                    onClick={() => {
                      setLocalValue(option.value);
                      onChange(option.value);
                    }}
                    className="flex h-8 cursor-pointer items-center px-4 text-sm text-zinc-200 hover:bg-zinc-800/50"
                    key={index}
                  >
                    {option.value === "left" && <FiAlignLeft className="mr-2" size={14} />}
                    {option.value === "center" && <FiAlignCenter className="mr-2" size={14} />}
                    {option.value === "right" && <FiAlignRight className="mr-2" size={14} />}
                    {option.label}
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

const fontCaseOptions = [
  { value: "none", label: "As typed" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
];

const FontCase = ({ id }: { id: string }) => {
  const [value, setValue] = useState("none");
  const onChangeFontCase = (value: string) => {
    setValue(value);
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            textTransform: value,
          },
        },
      },
    });
  };
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 items-center text-sm text-muted-foreground">
        Case
      </div>
      <div className="relative w-32">
        <div className="relative w-32">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="flex h-8 w-full items-center justify-between text-sm"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">{value}</p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="z-[300] w-32 p-0 py-1">
              {fontCaseOptions.map((option, index) => {
                return (
                  <div
                    onClick={() => onChangeFontCase(option.value)}
                    className="flex h-8 cursor-pointer items-center px-4 text-sm text-zinc-200 hover:bg-zinc-800/50"
                    key={index}
                  >
                    {option.label}
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};