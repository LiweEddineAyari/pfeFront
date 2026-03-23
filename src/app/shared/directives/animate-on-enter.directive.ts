import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appAnimateOnEnter]',
  standalone: true,
})
export class AnimateOnEnterDirective implements OnInit {
  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const element = this.el.nativeElement;
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      });
    });
  }
}
