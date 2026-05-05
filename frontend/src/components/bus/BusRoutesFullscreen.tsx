import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawBusData from '../../data/collegeBusRoutes.json';
import type { CollegeBusRoute, CollegeBusRoutesData } from '../../data/collegeBusRoutes.types';
import { findBestBusStopHighlight, visibleRouteStartIndex } from '../../lib/busRoutesMatch';

const DATA = rawBusData as CollegeBusRoutesData;
const ROUTE_LIST = DATA.routes;

function telHref(phone: string): string {
  const t = phone.trim().replace(/\s+/g, '');
  return t ? `tel:${t}` : '';
}

type Props = {
  highlightQuery: string | null | undefined;
  onClose: () => void;
};

/** Fullscreen bus routes; parent mounts this only when active so close fully unmounts the tree. */
export default function BusRoutesFullscreen({ highlightQuery, onClose }: Props) {
  const routes = ROUTE_LIST as CollegeBusRoute[];
  const routeCount = routes.length;

  const [focusedRouteNum, setFocusedRouteNum] = useState<number>(routes[0]?.route_number ?? 1);
  const [highlightStop, setHighlightStop] = useState<{ routeNum: number; name: string } | null>(
    null,
  );
  const [tripletSlide, setTripletSlide] = useState<'left' | 'right' | 'none'>('none');

  const prevStartRef = useRef(0);
  const tripletOpenedRef = useRef(false);

  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const highlightMatch = useMemo(
    () => findBestBusStopHighlight(typeof highlightQuery === 'string' ? highlightQuery : '', routes),
    [highlightQuery, routes],
  );

  const startIndex = useMemo(
    () => visibleRouteStartIndex(routeCount, focusedRouteNum, routes),
    [routeCount, focusedRouteNum, routes],
  );

  const visibleTriple = useMemo(() => routes.slice(startIndex, startIndex + 3), [routes, startIndex]);

  useEffect(() => {
    if (highlightMatch) {
      setFocusedRouteNum(highlightMatch.routeNumber);
      setHighlightStop({
        routeNum: highlightMatch.routeNumber,
        name: highlightMatch.stopName,
      });
      return;
    }
    const firstNum = routes[0]?.route_number ?? 1;
    setFocusedRouteNum(firstNum);
    setHighlightStop(null);
  }, [highlightMatch, routes]);

  useEffect(() => {
    if (!tripletOpenedRef.current) {
      tripletOpenedRef.current = true;
      prevStartRef.current = startIndex;
      setTripletSlide('none');
      return;
    }
    const prev = prevStartRef.current;
    if (prev !== startIndex) {
      setTripletSlide(startIndex > prev ? 'left' : 'right');
      prevStartRef.current = startIndex;
      const timer = window.setTimeout(() => setTripletSlide('none'), 420);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [startIndex]);

  const scrollRouteIntoView = useCallback((rn: number) => {
    const el = pillRefs.current.get(rn);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => scrollRouteIntoView(focusedRouteNum));
    return () => cancelAnimationFrame(id);
  }, [focusedRouteNum, scrollRouteIntoView]);

  const pillKeys = `${startIndex}-${focusedRouteNum}`;

  return (
    <motion.div
      key="bus-routes-fs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bus-routes-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[1200] flex max-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
          style={{
            background:
              'linear-gradient(165deg, #f8f5ff 0%, #ebe4ff 35%, #e8dff8 62%, #f3ecff 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-95"
            style={{
              background:
                'radial-gradient(120% 80% at 50% -10%, rgba(167,139,250,0.42) 0%, transparent 52%)',
            }}
            aria-hidden
          />

          <header className="relative z-[1] flex shrink-0 flex-col gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-10 sm:pb-4 sm:pt-6">
            <motion.button
              type="button"
              aria-label="Close bus routes"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="flex items-center gap-2 rounded-2xl border-2 border-[#2a115c]/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(252,231,243,0.65),rgba(167,139,250,0.28))] px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_32px_rgba(55,24,112,0.18)] backdrop-blur-xl transition-colors hover:border-[#17072f]/85"
            >
              <ArrowLeft className="h-5 w-5 text-[#2a115c]" strokeWidth={2.2} />
              Close
            </motion.button>

            <div className="pointer-events-none text-center sm:absolute sm:left-1/2 sm:top-[2.85rem] sm:w-[min(640px,74vw)] sm:-translate-x-1/2">
              <h1 id="bus-routes-title" className="text-balance font-serif text-[1.65rem] font-semibold tracking-tight text-[#17072f] sm:text-[1.95rem]">
                College Bus Routes
              </h1>
              <p className="mt-2 text-[0.9rem] leading-snug text-slate-600 sm:text-[0.95rem]">
                Select a route to view stops and timings
              </p>
            </div>
            <div className="hidden w-[148px] shrink-0 sm:block" aria-hidden />
          </header>

          <div className="relative z-[1] shrink-0 px-4 pb-3 sm:px-10">
            <div
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
              style={{
                touchAction: 'pan-x',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(147,119,237,0.55) transparent',
              }}
            >
              {routes.map((r) => {
                const active = focusedRouteNum === r.route_number;
                return (
                  <button
                    key={r.route_number}
                    ref={(el) => {
                      if (el) pillRefs.current.set(r.route_number, el);
                      else pillRefs.current.delete(r.route_number);
                    }}
                    type="button"
                    onClick={() => {
                      setFocusedRouteNum(r.route_number);
                      scrollRouteIntoView(r.route_number);
                    }}
                    className={`snap-center shrink-0 rounded-[1.35rem] border-2 px-[1.35rem] py-[0.82rem] text-[15px] font-semibold tracking-tight transition-[box-shadow,transform,border-color,background-color] duration-300 min-h-[48px] ${
                      active
                        ? 'border-[#553c9a] bg-[linear-gradient(140deg,#fffefb_12%,rgba(237,227,255,0.95)_55%,rgba(196,181,253,0.45)_118%)] text-[#1e0b43] shadow-[0_12px_40px_rgba(91,61,173,0.35),inset_0_1px_0_rgba(255,255,255,0.85)] ring-2 ring-[#c4b5fd]/95'
                        : 'border-[#6b5285]/55 bg-white/76 text-[#2d1b54] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] hover:border-[#5b3aa5]/72 hover:bg-white/92'
                    }`}
                  >
                    Route {r.route_number}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-[1] mx-auto mb-8 w-full max-w-[1860px] shrink-0 px-4 pb-8 sm:mb-10 sm:px-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pillKeys}
                initial={{
                  opacity: 0,
                  x: tripletSlide === 'left' ? 36 : tripletSlide === 'right' ? -36 : 0,
                  filter: 'blur(10px)',
                }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{
                  opacity: 0,
                  x: tripletSlide === 'left' ? -28 : tripletSlide === 'right' ? 28 : 0,
                  filter: 'blur(8px)',
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto grid w-full grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:justify-center"
              >
                {visibleTriple.map((route, cardIdx) => (
                  <motion.article
                    key={`${pillKeys}-${route.route_number}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: 0.05 + cardIdx * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex h-full max-w-xl w-full flex-col overflow-visible rounded-[1.85rem] border border-[#5b4494]/52 bg-[linear-gradient(180deg,#fffffffb_8%,rgba(248,243,255,0.98)_92%)] shadow-[0_26px_64px_-16px_rgba(55,24,112,0.28),inset_0_1px_0_rgba(255,255,255,1)] mx-auto xl:mx-0"
                  >
                    <div className="shrink-0 border-b border-violet-200/70 bg-[linear-gradient(180deg,#ffffff_25%,rgba(241,237,253,0.85)_118%)] px-4 pb-3 pt-4 backdrop-blur-sm sm:px-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6846a9]">
                        Route {route.route_number}
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-[0.72rem] font-medium text-slate-500">Driver</span>
                      </div>
                      <div className="mt-0.5 text-[0.98rem] font-semibold leading-tight text-slate-900 sm:text-[1.02rem]">
                        {route.driver.name}
                      </div>
                      <a
                        href={telHref(route.driver.phone)}
                        className="mt-0.5 inline-block text-[13px] font-medium leading-tight text-[#4c1d95] underline decoration-violet-300 underline-offset-2 sm:text-[14px]"
                      >
                        {route.driver.phone}
                      </a>
                      {route.coordinator ? (
                        <>
                          <div className="mt-3 flex flex-wrap items-baseline gap-2">
                            <span className="text-[0.72rem] font-medium text-slate-500">
                              Coordinator
                            </span>
                          </div>
                          <div className="mt-0.5 text-[0.95rem] font-semibold leading-tight text-slate-900">
                            {route.coordinator.name}
                          </div>
                          <a
                            href={telHref(route.coordinator.phone)}
                            className="mt-0.5 inline-block text-[13px] font-medium leading-tight text-[#4c1d95] underline decoration-violet-300 underline-offset-2 sm:text-[14px]"
                          >
                            {route.coordinator.phone}
                          </a>
                        </>
                      ) : null}
                    </div>
                    <ul className="flex flex-1 flex-col justify-start overflow-visible px-3 py-3 sm:px-4 sm:py-3">
                      {route.stops.map((stop, si) => {
                        const hl =
                          highlightStop &&
                          highlightStop.routeNum === route.route_number &&
                          highlightStop.name === stop.name;
                        return (
                          <li key={`${route.route_number}-${stop.name}-${si}`}>
                            <div
                              className={`rounded-lg px-2 py-[6px] sm:py-2 sm:px-2.5 ${
                                hl
                                  ? 'bg-[linear-gradient(90deg,rgba(196,181,253,0.55)_0%,rgba(237,233,254,0.9)_76%)] shadow-[inset_0_0_0_1px_rgba(109,76,206,0.35)] ring-[1.5px] ring-[#c4b5fd]/90'
                                  : 'bg-transparent'
                              }`}
                            >
                              <span className="text-[13px] font-medium leading-[1.35] text-slate-900 sm:text-[14px]">
                                {stop.name}
                                <span className="font-normal text-slate-500"> — </span>
                                <span className="font-bold tabular-nums text-[#3b0764]">
                                  {stop.time}
                                </span>
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.article>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
  );
}
