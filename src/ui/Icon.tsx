import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Compass,
  Database,
  Download,
  ExternalLink,
  Flame,
  Focus,
  LockKeyhole,
  MapPin,
  Moon,
  Radio,
  RotateCcw,
  Satellite,
  ScanSearch,
  ShieldCheck,
  Sun,
  Truck,
  Users,
} from 'lucide-react';

const icons = {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Compass,
  Database,
  Download,
  ExternalLink,
  Flame,
  Focus,
  LockKeyhole,
  MapPin,
  Moon,
  Radio,
  RotateCcw,
  Satellite,
  ScanSearch,
  ShieldCheck,
  Sun,
  Truck,
  Users,
};
export type IconName = keyof typeof icons;
export function Icon({ name }: { name: IconName }) {
  const Glyph = icons[name];
  return <Glyph width={18} height={18} strokeWidth={1.8} aria-hidden="true" />;
}
