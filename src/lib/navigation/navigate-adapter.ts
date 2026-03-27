export type NavigateAdapter = {
  navigate: (href: string) => void;
  reload: () => void;
};

export function createBrowserNavigateAdapter(): NavigateAdapter {
  return {
    navigate: (href) => {
      window.location.assign(href);
    },
    reload: () => {
      window.location.reload();
    }
  };
}
