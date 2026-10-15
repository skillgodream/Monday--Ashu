import { Lesson } from '../types';
import { TeachMePlan } from './types';
import { planKnowItSlides } from './knowItPlanner';

export function planSlides(lesson: Lesson): TeachMePlan {
  return planKnowItSlides(lesson);
}

