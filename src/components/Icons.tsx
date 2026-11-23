import type { ReactNode, SVGProps } from 'react';

function IconBase({ children, ...props }: SVGProps<SVGSVGElement> & { children?: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

const make = (kind: 'spark' | 'heart' | 'arrow' | 'circle' | 'book' | 'media' | 'search' = 'circle') =>
  function Icon(props: SVGProps<SVGSVGElement>) {
    return <IconBase {...props}>{
      kind === 'heart' ? <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /> :
      kind === 'spark' ? <><path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></> :
      kind === 'arrow' ? <><path d="m15 18-6-6 6-6"/><path d="M9 12h11"/></> :
      kind === 'book' ? <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v18h4.5A2.5 2.5 0 0 1 20 22V4.5Z"/></> :
      kind === 'media' ? <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 15 3-3 2 2 3-4 3 5"/></> :
      kind === 'search' ? <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></> :
      <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></>
    }</IconBase>;
  };

export const Sparkles = make('spark'); export const Star = make('spark'); export const Heart = make('heart'); export const MessageCircleHeart = make('heart'); export const HeartHandshake = make('heart');
export const BookHeart = make('book'); export const BookOpen = make('book'); export const Images = make('media'); export const GalleryHorizontalEnd = make('media'); export const Search = make('search');
export const ChevronLeft = make('arrow'); export function ChevronRight(props: SVGProps<SVGSVGElement>) { return <ChevronLeft {...props} style={{ ...props.style, transform: 'rotate(180deg)' }} />; }
export const Moon = make(); export const Sun = make('spark'); export const Pause = make(); export const Play = make(); export const LockKeyhole = make(); export const KeyRound = make(); export const FastForward = make('arrow');
export const History = make(); export const CalendarDays = make(); export const Leaf = make('heart'); export const Crown = make('spark'); export const CloudRain = make(); export const MoonStar = make('spark');
export const Download = make('arrow'); export const FileQuestion = make(); export const LoaderCircle = make(); export const X = make(); export const Filter = make(); export const Snowflake = make('spark'); export const Bookmark = make('heart');
