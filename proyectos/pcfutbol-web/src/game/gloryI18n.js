/**
 * Presentation-only i18n helpers for Glory Mode data (cards, events, combos,
 * milestones, divisions, archetypes). Game logic stays keyed by stable ids in
 * gloryEngine.js / gloryUnlocks.js — these helpers only translate the *display*
 * strings, falling back to the original Spanish data when a key is missing.
 */

export const gloryCardName = (t, card) =>
  card ? t(`glory.cardData.${card.id}.name`, { defaultValue: card.name }) : '';

export const gloryCardDesc = (t, card) =>
  card ? t(`glory.cardData.${card.id}.desc`, { defaultValue: card.description }) : '';

export const gloryDivisionName = (t, division) =>
  division ? t(`glory.divisions.${division.id}`, { defaultValue: division.name }) : '';

export const gloryDivisionNameById = (t, id, fallback = '') =>
  id ? t(`glory.divisions.${id}`, { defaultValue: fallback || id }) : fallback;

export const gloryComboName = (t, combo) =>
  combo ? t(`glory.combos.${combo.id}.name`, { defaultValue: combo.name }) : '';

export const gloryComboBonus = (t, combo) =>
  combo ? t(`glory.combos.${combo.id}.bonus`, { defaultValue: combo.bonus }) : '';

export const gloryMilestoneName = (t, milestone) =>
  milestone ? t(`glory.milestones.${milestone.id}.name`, { defaultValue: milestone.name }) : '';

export const gloryMilestoneDesc = (t, milestone) =>
  milestone ? t(`glory.milestones.${milestone.id}.desc`, { defaultValue: milestone.description }) : '';

export const gloryEventTitle = (t, event) =>
  event ? t(`glory.event.${event.id}.title`, { defaultValue: event.title }) : '';

export const gloryEventDesc = (t, event) =>
  event ? t(`glory.event.${event.id}.desc`, { defaultValue: event.description }) : '';

export const gloryEventOption = (t, event, key /* 'optA' | 'optB' */, fallback) =>
  event ? t(`glory.event.${event.id}.${key}`, { defaultValue: fallback }) : fallback;

export const gloryArchetypeLabel = (t, archetype, fallback) =>
  archetype ? t(`glory.archetypes.${archetype}.label`, { defaultValue: fallback }) : fallback;

export const gloryArchetypeRisk = (t, archetype, fallback) =>
  archetype ? t(`glory.archetypes.${archetype}.risk`, { defaultValue: fallback }) : fallback;
