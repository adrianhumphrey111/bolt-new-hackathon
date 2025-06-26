import useLayoutStore from "../store/use-layout-store";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import { Images } from "./images";
import { Videos } from "./videos";

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

interface MenuItemProps {
  videos: UserVideo[]
}

const ActiveMenuItem = ({ videos }: MenuItemProps) => {
  const { activeMenuItem } = useLayoutStore();

  if (activeMenuItem === "texts") {
    return <Texts />;
  }
  if (activeMenuItem === "shapes") {
    return <Elements />;
  }
  if (activeMenuItem === "videos") {
    return <Videos videos={videos} />;
  }

  if (activeMenuItem === "audios") {
    return <Audios />;
  }

  if (activeMenuItem === "images") {
    return <Images />;
  }

  return null;
};

export const MenuItem = ({ videos }: MenuItemProps) => {
  return (
    <div className="w-[300px] flex-1">
      <ActiveMenuItem videos={videos} />
    </div>
  );
};
