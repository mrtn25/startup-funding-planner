import InplicitTool from "@/components/inplicit/InplicitTool";

/* Nothing is checked per request any more, so the shell prerenders like the
   rest of the site and the planner hydrates on top of it. */

export default function InplicitPage() {
  return <InplicitTool />;
}
