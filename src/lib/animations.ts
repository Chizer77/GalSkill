import { Variants, Transition } from 'framer-motion'

/**
 * Custom easing function for a smoother, more "organic" feel.
 * Rapid start, slow finish (Quart Out equivalent).
 */
export const GS_EASE = [0.16, 1, 0.3, 1]

/**
 * Standard transition configuration for main UI sections.
 */
export const GS_TRANSITION: Transition = {
    duration: 0.6,
    ease: GS_EASE
}

/**
 * Section variants for entering and exiting UI blocks.
 * Includes vertical displacement and blur for a "paper/ink" feel.
 */
export const SECTION_VARIANTS: Variants = {
    initial: {
        opacity: 0,
        y: 8,
        filter: 'blur(8px)',
        scale: 0.99
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        scale: 1,
        transition: GS_TRANSITION
    },
    exit: {
        opacity: 0,
        y: -4,
        filter: 'blur(8px)',
        scale: 0.995,
        transition: { ...GS_TRANSITION, duration: 0.5 }
    }
}

/**
 * Variants for text elements or small details within sections.
 */
export const STAGGER_CHILD_VARIANTS: Variants = {
    initial: { opacity: 0, y: 4 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: GS_EASE }
    }
}

/**
 * Variants for items that expand/collapse (like work lists).
 */
export const EXPAND_VARIANTS: Variants = {
    initial: { opacity: 0, height: 0 },
    animate: {
        opacity: 1,
        height: 'auto',
        transition: { duration: 0.3, ease: GS_EASE }
    },
    exit: {
        opacity: 0,
        height: 0,
        transition: { duration: 0.2, ease: GS_EASE }
    }
}
