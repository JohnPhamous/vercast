import { useEffect, useState } from "react";
import { Icon, Image, MenuBarExtra, getPreferenceValues, open } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import useVercel from "./hooks/use-vercel-info";
import { LocalStorage } from "@raycast/api";

export const token = getPreferenceValues().accessToken;

interface RecentPreviewDeploymentResponse {
  payload: {
    deployment: {
      status: string;
      alias: string;
      creator: {
        username: string;
      };
    };
    prMetadata: {
      title: string;
      description: string;
    };
  };
}

interface RecentPreviewDeployment {
  name: string;
  subtitle: string;
  url: string;
  status: string;
  icon: Image.ImageLike;
}

const formatDescription = (description: string) => {
  return description.slice(0, 25) + "...";
};

const usePreviewDeployments = (slug: string) => {
  const [state, setState] = useState<{ unseen: RecentPreviewDeployment[]; isLoading: boolean }>({
    unseen: [],
    isLoading: true,
  });

  const { data, isLoading } = useFetch<RecentPreviewDeploymentResponse[]>(
    `https://vercel.com/api/recents?limit=7&teamId=${slug}&type=preview`,
    {
      headers: {
        Authorization: "Bearer " + token,
      },
      onError: () => {
        // no-op
      },
    }
  );

  useEffect(() => {
    (async () => {
      setState({
        unseen: (data || []).map((preview) => {
          return {
            name: preview.payload.prMetadata.title,
            subtitle: preview.payload.deployment.creator.username,
            url: `https://${preview.payload.deployment.alias[0]}`,
            status: preview.payload.deployment.status,
            icon: getFavicon(`https://${preview.payload.deployment.alias[0]}`),
          };
        }),
        isLoading,
      });
    })();
  }, []);
  return state;
};

export default function Command() {
  const { teams, selectedTeam } = useVercel();
  const selectedTeamMeta = (teams || []).find((team) => team.id === selectedTeam);
  const { unseen: unseen, isLoading } = usePreviewDeployments(selectedTeamMeta?.slug || "vercel");

  return (
    <MenuBarExtra icon="icon.png" isLoading={isLoading} title={`${unseen.length}`}>
      {unseen.map((preview) => (
        <MenuBarExtra.Item
          key={preview.url}
          title={preview.name}
          onAction={() => open(preview.url)}
          subtitle={preview.subtitle}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu icon={Icon.Cog} title={`Select Scope (${selectedTeamMeta?.name})`}>
          {(teams || []).map((team) => {
            return (
              <MenuBarExtra.Item
                key={team.id}
                title={team.name}
                icon={team.id === selectedTeam ? Icon.CheckCircle : Icon.Circle}
                onAction={async () => {
                  await LocalStorage.setItem("selectedTeamId", team.id);
                }}
              />
            );
          })}
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item
          title={`Vercel Dashboard`}
          icon="icon.png"
          onAction={async () => {
            open("");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
