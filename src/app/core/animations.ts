import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  state,
} from '@angular/animations';

export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(24px)' }),
    animate(
      '400ms ease-out',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
]);

export const staggerList = trigger('staggerList', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        stagger(
          80,
          animate(
            '300ms ease-out',
            style({ opacity: 1, transform: 'translateX(0)' })
          )
        ),
      ],
      { optional: true }
    ),
  ]),
]);

export const cardHover = trigger('cardHover', [
  state(
    'hovered',
    style({
      transform: 'translateY(-4px)',
      boxShadow: '0 20px 40px rgba(5,205,153,0.15)',
    })
  ),
  state(
    'default',
    style({
      transform: 'translateY(0)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    })
  ),
  transition('* <=> *', animate('200ms ease-out')),
]);

export const expandCollapse = trigger('expandCollapse', [
  state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden' })),
  state('expanded', style({ height: '*', opacity: 1, overflow: 'hidden' })),
  transition('collapsed <=> expanded', animate('250ms ease-in-out')),
]);

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 })),
  ]),
]);
