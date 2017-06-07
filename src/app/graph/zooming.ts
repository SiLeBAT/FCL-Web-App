import {Subject} from 'rxjs/Rx';

export function Zooming(params: Subject<boolean>) {
  return new ZoomingClass(this, params);
}

class ZoomingClass {

  private static readonly ZOOM_FACTOR = 1.5;
  private static readonly SLIDER_PADDING = 2;

  private cy: any;
  private container: HTMLElement;

  private zoomDiv: HTMLElement;
  private zoomIn: HTMLElement;
  private zoomOut: HTMLElement;
  private reset: HTMLElement;
  private slider: HTMLElement;
  private sliderBackground: HTMLElement;
  private sliderHandle: HTMLElement;
  private noZoomTick: HTMLElement;

  private zooming = false;
  private sliding = false;

  private static createElement(id: string): HTMLElement {
    const div = document.createElement('div');

    div.id = id;

    return div;
  }

  private static createIconElement(id: string, icon: string): HTMLElement {
    const div = document.createElement('div');
    const i = document.createElement('i');

    i.className = 'material-icons';
    i.innerText = icon;

    div.id = id;
    div.appendChild(i);

    return div;
  }

  private static getHeightWithoutBorder(element: HTMLElement) {
    const style: CSSStyleDeclaration = getComputedStyle(element);

    return element.offsetHeight - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
  }

  constructor(cy: any, params: Subject<boolean>) {
    params.subscribe(show => {
      if (show) {
        if (this.zoomDiv.parentNode == null) {
          this.container.appendChild(this.zoomDiv);
        }
      } else {
        this.zoomDiv.remove();
      }
    });

    this.cy = cy;
    this.container = cy.container();

    this.zoomDiv = ZoomingClass.createElement('cy-zoom');
    this.zoomIn = ZoomingClass.createIconElement('cy-zoom-in', 'add');
    this.zoomOut = ZoomingClass.createIconElement('cy-zoom-out', 'remove');
    this.reset = ZoomingClass.createIconElement('cy-zoom-reset', 'zoom_out_map');
    this.slider = ZoomingClass.createElement('cy-zoom-slider');
    this.sliderBackground = ZoomingClass.createElement('cy-zoom-slider-background');
    this.sliderHandle = ZoomingClass.createElement('cy-zoom-slider-handle');
    this.noZoomTick = ZoomingClass.createElement('cy-zoom-no-zoom-tick');

    this.slider.appendChild(this.sliderBackground);
    this.slider.appendChild(this.sliderHandle);
    this.slider.appendChild(this.noZoomTick);

    this.zoomDiv.appendChild(this.reset);
    this.zoomDiv.appendChild(this.zoomIn);
    this.zoomDiv.appendChild(this.zoomOut);
    this.zoomDiv.appendChild(this.slider);
    this.zoomDiv.onmousedown = e => e.stopPropagation();
    this.zoomDiv.ontouchstart = e => e.stopPropagation();

    this.container.appendChild(this.zoomDiv);

    this.setTickToNoZoom();
    this.setSliderFromZoom();
    this.cy.on('zoom', () => {
      if (!this.sliding) {
        this.setSliderFromZoom();
      }
    });

    new Hammer(this.zoomIn).on('tap pressup', () => {
      this.zooming = true;
      this.zoomTo(cy.zoom() * ZoomingClass.ZOOM_FACTOR);
      this.zooming = false;
    });
    new Hammer(this.zoomOut).on('tap pressup', () => {
      this.zooming = true;
      this.zoomTo(cy.zoom() / ZoomingClass.ZOOM_FACTOR);
      this.zooming = false;
    });
    new Hammer(this.reset).on('tap pressup', () => {
      if (cy.elements().size() === 0) {
        cy.reset();
      } else {
        cy.nodes().style({'font-size': 0});
        cy.fit();
      }
    });

    const sliderHammer = new Hammer(this.slider);

    sliderHammer.get('pan').set({threshold: 1, direction: Hammer.DIRECTION_ALL});
    sliderHammer.on('press tap', e => {
      this.setSliderFromMouse(e.srcEvent);
    });
    sliderHammer.on('panstart', () => {
      this.sliding = true;
      this.zooming = true;
      this.sliderHandle.className = 'active';
    });
    sliderHammer.on('panmove', e => {
      this.setSliderFromMouse(e.srcEvent);
    });
    sliderHammer.on('panend', () => {
      this.sliding = false;
      this.zooming = false;
      this.sliderHandle.className = '';
    });

    const sliderHandleHammer = new Hammer(this.sliderHandle);

    sliderHandleHammer.get('pan').set({threshold: 1, direction: Hammer.DIRECTION_ALL});
    sliderHandleHammer.on('panstart', () => {
      this.sliding = true;
      this.zooming = true;
      this.sliderHandle.className = 'active';
    });
    sliderHandleHammer.on('panmove', e => {
      this.setSliderFromMouse(e.srcEvent);
    });
    sliderHandleHammer.on('panend', () => {
      this.sliding = false;
      this.zooming = false;
      this.sliderHandle.className = '';
    });
  }

  private zoomTo(newZoom: number) {
    newZoom = Math.min(Math.max(newZoom, this.cy.minZoom()), this.cy.maxZoom());

    if (newZoom !== this.cy.zoom()) {
      this.cy.zoom({
        level: newZoom,
        renderedPosition: {x: this.container.offsetWidth / 2, y: this.container.offsetHeight / 2}
      });
    }
  }

  private setSliderFromMouse(e: MouseEvent) {
    const minPos = ZoomingClass.SLIDER_PADDING;
    const maxPos = this.slider.offsetHeight - ZoomingClass.getHeightWithoutBorder(this.sliderHandle) - ZoomingClass.SLIDER_PADDING;
    const pos = Math.min(Math.max(e.pageY - this.slider.getBoundingClientRect().top - this.sliderHandle.offsetHeight / 2, minPos), maxPos);

    this.sliderHandle.style.top = pos + 'px';

    const percent = 1 - (pos - minPos) / (maxPos - minPos);
    const minZoom = this.cy.minZoom();
    const maxZoom = this.cy.maxZoom();

    this.zoomTo(Math.pow(maxZoom, percent + Math.log(minZoom) / Math.log(maxZoom) * (1 - percent)));
  }

  private setSliderFromZoom() {
    const minZoom = this.cy.minZoom();
    const maxZoom = this.cy.maxZoom();
    const percent = 1 - Math.log(this.cy.zoom() / minZoom) / Math.log(maxZoom / minZoom);
    const minPos = ZoomingClass.SLIDER_PADDING;
    const maxPos = this.slider.offsetHeight - ZoomingClass.getHeightWithoutBorder(this.sliderHandle) - ZoomingClass.SLIDER_PADDING;

    this.sliderHandle.style.top = Math.min(Math.max(percent * (maxPos - minPos) + minPos, minPos), maxPos) + 'px';
  }

  private setTickToNoZoom() {
    const minZoom = this.cy.minZoom();
    const maxZoom = this.cy.maxZoom();
    const percent = 1 - Math.log(1 / minZoom) / Math.log(maxZoom / minZoom);
    const minPos = ZoomingClass.SLIDER_PADDING;
    const maxPos = this.slider.offsetHeight - ZoomingClass.getHeightWithoutBorder(this.noZoomTick) - ZoomingClass.SLIDER_PADDING;

    this.noZoomTick.style.top = Math.min(Math.max(percent * (maxPos - minPos) + minPos, minPos), maxPos) + 'px';
  }
}