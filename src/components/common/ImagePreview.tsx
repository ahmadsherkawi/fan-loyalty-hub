import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";

/** Shows a generated card inside the app, for phones where a download would open a blank page. */
export function ImagePreview({ url, onClose }: { url: string | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={!!url} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>{t("share.saveTitle")}</DialogTitle></DialogHeader>
        {url && <img src={url} alt="" className="w-full rounded-2xl" style={{ WebkitTouchCallout: "default" }} />}
        <DialogDescription className="text-center">{t("share.holdToSave")}</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
