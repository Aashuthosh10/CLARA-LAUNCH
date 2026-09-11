export const DAILY_THOUGHTS = [
  'Tomorrow’s intelligence, engineered by today’s minds.',
  'Bridging the gap between human curiosity and artificial intelligence.',
  'Where code meets vision, the future takes shape.',
  'Shaping tomorrow, one line of code at a time.',
  'Algorithms today, breakthroughs tomorrow.',
  'Intelligence is no longer just natural—it’s engineered.',
  'Coding the framework of tomorrow’s possibilities.',
  'Transforming bold ideas into intelligent reality.',
  "The future isn't written; it's programmed.",
  'Powering the next generation of human ingenuity.',
  'Beyond computing: shaping an intelligent world.',
  'Where logic creates magic.',
  'Automated systems, limitless horizons.',
  'Data in, innovation out.',
  'Building the technology that builds the future.',
  'From concept to creation through intelligent design.',
  'Redefining what machines can achieve.',
  'Driving progress through autonomous thinking.',
  'Creating technology that understands human needs.',
  'The intersection of artificial intelligence and human ambition.',
  'Engineering the solutions to questions not yet asked.',
  'Precision in design, excellence in execution.',
  'Turning complex problems into seamless interactions.',
  'Hardware, software, and human purpose combined.',
  'Structure, logic, and relentless execution.',
  'Engineering is the art of making the impossible functional.',
  'Built on logic, driven by purpose.',
  'Solving real-world challenges with intelligent systems.',
  'Designing the infrastructure of tomorrow.',
  'Smart technology for a smarter campus.',
  'Crafting elegant solutions from complex data.',
  'Where technical mastery meets creative design.',
  'Optimization is the quiet engine of progress.',
  'Turning raw data into meaningful action.',
  'Engineering the bridge between dreamers and doers.',
  'Small algorithms, massive impact.',
  'Built to assist, designed to innovate.',
  'System status: continuously evolving.',
  'From blueprint to reality with smart systems.',
  'Precision engineering for an automated world.',
  'Curiosity is the true engine of discovery.',
  'The best way to predict the future is to build it.',
  'Knowledge drives innovation; action drives progress.',
  'Innovate today to lead tomorrow.',
  'Question the present, invent the future.',
  "Great minds don't just adapt—they pioneer.",
  'Every breakthrough begins with a single question.',
  'Continuous learning fuels exponential growth.',
  'Unlocking human potential through smarter technology.',
  'Think boldly, engineer precisely, execute relentless.',
  'Passion sparks the idea; persistence makes it real.',
  'Knowledge is power, but applied knowledge is progress.',
  'The future belongs to those who create it.',
  'Driven by inquiry, sustained by intellect.',
  'Big visions start with small iterations.',
  'Challenge assumptions, invent alternatives.',
  'Strive for logic, build with impact.',
  'Where curiosity leads, technology follows.',
  'Empowering minds through intelligent design.',
  'The ultimate technology is one that serves humanity.',
  'Learn to lead, innovate to transform.',
  'Nurturing the innovators of tomorrow.',
  "Excellence is not a goal; it's our baseline.",
  'Empowering student minds to shape global futures.',
  'Where ambition finds its technical edge.',
  'Inspiring leaders, engineering pioneers.',
  'Ideas flourish where innovation is nurtured.',
  'A hub for thinkers, creators, and builders.',
  'Cultivating tech innovators for a changing world.',
  'Leading the charge toward tomorrow’s breakthroughs.',
  'From campus classrooms to global solutions.',
  'Driving academic excellence through technology.',
  'Fostering the spirit of creation and discovery.',
  'Where knowledge meets practical execution.',
  'Educating minds, inspiring technology.',
  'Shaping thinkers who transform industry.',
  'Collaborative minds building a smarter future.',
  'The launchpad for tomorrow’s technology leaders.',
  'Grounded in principles, aiming for the stars.',
  'Empowering every student to innovate freely.',
] as const;

const DAILY_THOUGHT_BOUNDARY_HOUR = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function getThoughtDay(date: Date): Date {
  const thoughtDay = new Date(date);
  if (thoughtDay.getHours() < DAILY_THOUGHT_BOUNDARY_HOUR) {
    thoughtDay.setDate(thoughtDay.getDate() - 1);
  }
  return thoughtDay;
}

/** Local calendar-day key used to animate only when the 7:00 AM thought day changes. */
export function getThoughtDayKey(date = new Date()): string {
  const thoughtDay = getThoughtDay(date);
  const month = String(thoughtDay.getMonth() + 1).padStart(2, '0');
  const day = String(thoughtDay.getDate()).padStart(2, '0');
  return `${thoughtDay.getFullYear()}-${month}-${day}`;
}

/** Selects a repeatable thought from the kiosk's local 7:00 AM-to-7:00 AM day. */
export function getDailyThoughtIndex(date = new Date()): number {
  const thoughtDay = getThoughtDay(date);
  const localDayNumber = Math.floor(
    Date.UTC(thoughtDay.getFullYear(), thoughtDay.getMonth(), thoughtDay.getDate()) / DAY_MS,
  );
  return ((localDayNumber % DAILY_THOUGHTS.length) + DAILY_THOUGHTS.length) % DAILY_THOUGHTS.length;
}

export function getDailyThought(date = new Date()): string {
  return DAILY_THOUGHTS[getDailyThoughtIndex(date)];
}
