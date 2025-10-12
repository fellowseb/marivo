import './style.css';

interface LogoSpotlightsEffectOptions {
  initialDelay: number;
}

class LogoSpotlightsEffect {
  public init(opts: LogoSpotlightsEffectOptions) {
    this.listenTryOutBtnClick();
    this.listenTryOutBtnHover();
    this.showLightRays();
    this.initialTimeoutId = setTimeout(() => {
      this.hideLightRays();
      this.startMovement();
    }, opts.initialDelay);
  }

  private startMovement() {
    clearInterval(this.intervalId);
    clearTimeout(this.initialTimeoutId);
    this.intervalId = setInterval(() => {
      const leftSpotAngle = Math.random() * 100 - 50;
      const rightSpotAngle = Math.random() * 100 - 50;
      const leftSpotSpeed = Math.random() * 0.5 + 0.5;
      const rightSpotSpeed = Math.random() * 0.5 + 0.5;
      this.moveSpotlights(
        leftSpotAngle,
        leftSpotSpeed,
        rightSpotAngle,
        rightSpotSpeed,
      );
    }, 1000);
  }

  private stopMovement() {
    clearInterval(this.intervalId);
    clearTimeout(this.initialTimeoutId);
  }

  private moveSpotlights(
    leftSpotAngle: number,
    leftSpotSpeed: number,
    rightSpotAngle: number,
    rightSpotSpeed: number,
  ) {
    const rightSpotElem = document.getElementById('logo-spot-right');
    if (!rightSpotElem) {
      throw new Error('Unable to find logo-spot-right element');
    }
    const leftSpotElem = document.getElementById('logo-spot-left');
    if (!leftSpotElem) {
      throw new Error('Unable to find logo-spot-left element');
    }
    leftSpotElem.setAttribute(
      'style',
      `transform: rotate(${leftSpotAngle}deg); transition: transform ${leftSpotSpeed}s ease-out;`,
    );
    rightSpotElem.setAttribute(
      'style',
      `transform: rotate(${rightSpotAngle}deg); transition: transform ${rightSpotSpeed}s ease-out;`,
    );
  }

  private listenTryOutBtnHover() {
    const tryOutBtn = document.getElementById('try-out-btn');
    if (!tryOutBtn) {
      return;
    }
    tryOutBtn.addEventListener('mouseenter', () => {
      this.stopMovement();
      this.moveSpotlights(0, 0.1, 0, 0.1);
      this.showLightRays();
    });
    tryOutBtn.addEventListener('mouseleave', () => {
      this.hideLightRays();
      this.startMovement();
    });
  }

  private showLightRays() {
    const lightRaysElem = document.getElementById('logo-light-rays');
    if (!lightRaysElem) {
      return;
    }
    lightRaysElem.setAttribute('class', 'logo-light-rays');
  }

  private hideLightRays() {
    const lightRaysElem = document.getElementById('logo-light-rays');
    if (!lightRaysElem) {
      return;
    }
    lightRaysElem.setAttribute('class', 'logo-light-rays hidden');
  }

  private listenTryOutBtnClick() {
    const tryOutBtn = document.getElementById('try-out-btn');
    if (!tryOutBtn) {
      return;
    }
    // tryOutBtn.addEventListener('click', (event) => {
    //   event.preventDefault();
    //   this.hideBottomContent();
    //   setTimeout(() => {
    //     location.href = 'http://localhost:5173';
    //   }, 200);
    // });
  }

  // private hideBottomContent() {
  //   const homeBottomContentElem = document.getElementById(
  //     'home-bottom-content',
  //   );
  //   if (!homeBottomContentElem) {
  //     return;
  //   }
  //   homeBottomContentElem.setAttribute('class', `home-bottom-content hidden`);
  // }

  private intervalId?: number;
  private initialTimeoutId?: number;
}

const SPOTLIGHTS_MOVEMENT_DELAY_MS = 5_000;

window.addEventListener('DOMContentLoaded', function onDOMLoaded() {
  new LogoSpotlightsEffect().init({
    initialDelay: SPOTLIGHTS_MOVEMENT_DELAY_MS,
  });
});
