import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

export function NidiaCompanion({ onOpen }: { onOpen: () => void }) {
  return <Button variant="ghost" className="nidia-companion" onClick={onOpen} aria-label="Abrir assistente" title="Abrir assistente">
    <span className="nidia-companion-greeting">Vamos pensar juntas?</span>
    <span className="nidia-companion-robot"><Bot size={36} strokeWidth={1.7} aria-hidden="true" /></span>
  </Button>;
}