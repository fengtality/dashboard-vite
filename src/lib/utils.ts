import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a random config name like "blue-falcon"
const colors = ['red', 'blue', 'green', 'gold', 'silver', 'amber', 'jade', 'coral', 'cyan', 'teal', 'plum', 'sage', 'rust', 'navy', 'olive'];
const birds = ['falcon', 'eagle', 'hawk', 'raven', 'sparrow', 'robin', 'finch', 'owl', 'crane', 'heron', 'swift', 'wren', 'dove', 'lark', 'phoenix'];

export function generateConfigName(): string {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const bird = birds[Math.floor(Math.random() * birds.length)];
  return `${color}-${bird}`;
}
