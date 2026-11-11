import { Button } from "@/components/ui/button";
import character from "@/assets/nidia-companion.png";

export function NidiaCompanion({ onOpen }: { onOpen: () => void }) {
  return <Button variant="ghost" className="nidia-companion" onClick={onOpen} aria-label="Conversar com Nídia" title="Conversar com Nídia">
    <span className="nidia-companion-greeting">Vamos pensar juntas?</span>
    <img src={character} alt="" width={512} height={512} loading="lazy" />
    <span className="nidia-companion-name">Nídia <i aria-hidden="true" /></span>
  </Button>;
}