import { createFileRoute } from "@tanstack/react-router";
import TitanVial from "@/components/TitanVial";

export const Route = createFileRoute("/vial-test")({ component: C });

function C() {
  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      <TitanVial name="BPC-157" strength="10MG" lot="TE-2024-157" />
      <TitanVial name="CJC-1295" strength="5MG" lot="TE-2024-CJC" />
      <TitanVial name="Tesamorelin" strength="10MG" lot="TE-2024-TES" />
    </div>
  );
}
