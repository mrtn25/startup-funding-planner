import ScrollHero from "@/components/ScrollHero";
import SiteFooter from "@/components/SiteFooter";
import ToolSwitcher from "@/components/ToolSwitcher";

export default function Home() {
  return (
    <>
      <ScrollHero ctaHref="#tools" />
      <ToolSwitcher />
      <SiteFooter />
    </>
  );
}
