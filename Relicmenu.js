export class RelicMenu {
  constructor(relics = [], totalPoints = 0, onRelicChanged) {
    this.onRelicChanged = onRelicChanged;
    this.relics = relics;
    this.totalPoints = totalPoints;
    this.scrollY = 0;
    this.animTimer = 0;
    // Sidebar bounds — recalculated each draw()
    this.sidebarX = 0;
    this.sidebarY = 0;
    this.sidebarW = 0;
    this.sidebarH = 0;
    // Layout constants
    this.HEADER_H = 52;
    this.TAB_H = 32;
    this.FOOTER_H = 50;
    this.CARD_H = 72;
    this.CARD_GAP_Y = 8;
    this.CONTENT_PAD = 12;
    this.SCROLLBAR_W = 5;

    // Hover state
    this.hoverRelicIndex = -1;
    this.lastContentBounds = null;

    // Palette
    this.C = {
      sidebarBg: [6, 17, 8],
      divider: [0, 55, 22],
      cornerAccent: [0, 210, 65],
      borderGlow: [0, 180, 55],
      title: [198,160, 55],
      tabActive: [0, 200, 60],
      tabInactive: [80, 105, 82],
      tabHover: [130,160,132],
      cardActiveBg: [10, 50, 20],
      cardInactiveBg: [10, 24, 12],
      cardActiveBorder: [0, 190, 55],
      cardHoverBorder: [0, 255, 90],
      cardInactiveBorder: [28, 60, 32],
      iconActive: [0, 215, 68],
      iconInactive: [60, 90, 62],
      nameActive: [200,162, 55],
      nameInactive: [130,155,132],
      descActive: [140,172,142],
      descInactive: [68, 92, 70],
      rActive: [0, 175, 52],
      rLocked: [165, 50, 50],
      rCost: [85, 115, 88],
      footerLabel: [85, 110, 88],
      pointUsed: [0, 190, 58],
      pointAvail: [25, 60, 32],
      pointOver: [165, 42, 42],
      tooltipBg: [5, 15, 7],
      tooltipBorder: [0, 175, 52],
      tooltipTitle: [198,160, 55],
      tooltipText: [140,170,142],
      scrollBar: [0, 130, 42],
      scrollTrack:[15, 36, 18],
    };
  }

  setRelics(relics) {
    this.relics = relics;
    this.scrollY = 0;
  }
  setPoints(total) {
    this.totalPoints = total;
  }

  draw() {
    this.animTimer += 0.04;
    this.recalcBounds();
    push();
    this.drawSidebar();
    this.drawHeader();
    this.drawContent();
    this.drawScrollBar();
    this.drawFooter();
    pop();
    if (this.hoverRelicIndex >= 0) {
      const r = this.relics[this.hoverRelicIndex];
      if (r) this.drawTooltip(r);
    }
  }

  recalcBounds() {
    this.sidebarW = floor(width * 0.25);
    this.sidebarH = height;
    this.sidebarX = width - this.sidebarW;
    this.sidebarY = 0;
  }

  //sidebar
  drawSidebar() {
    const { sidebarX: sx, sidebarY: sy, sidebarW: sw, sidebarH: sh } = this;
    noStroke();
    fill(...this.C.sidebarBg);
    rect(sx, sy, sw, sh);
    //Glowing left border
    const pulse = 0.55 + sin(this.animTimer) * 0.2;
    drawingContext.shadowBlur = 18;
    drawingContext.shadowColor = `rgba(0,200,60,${pulse})`;
    stroke(...this.C.borderGlow, 180 + sin(this.animTimer * 1.1) * 40);
    strokeWeight(1.5);
    line(sx, sy, sx, sy + sh);
    drawingContext.shadowBlur = 0;
    // Corners
    const S = 14;
    stroke(...this.C.cornerAccent);
    strokeWeight(2);
    noFill();
    // Top-left
    line(sx, sy + 2, sx, sy + 2 + S);
    line(sx, sy + 2, sx + S, sy + 2);
    // Bottom-left
    line(sx, sy + sh - 2 - S, sx, sy + sh - 2);
    line(sx, sy + sh - 2, sx + S, sy + sh - 2);
  }

  canActivateMore() {
    return this.activeCount() < this.totalPoints;
  }

  drawHeader() {
    const { sidebarX: sx, sidebarW: sw } = this;
    const midY = this.sidebarY + this.HEADER_H / 2;
    //Title
    noStroke();
    fill(...this.C.title);
    textFont('Georgia');
    textStyle(ITALIC);
    textSize(18);
    textAlign(LEFT, CENTER);
    text('Relics', sx + 18, midY);
    textStyle(NORMAL);
    //points used
    const used  = this.activeCount();
    const total = this.totalPoints;
    textFont('Georgia');
    textStyle(ITALIC);
    textSize(18);
    textAlign(RIGHT, CENTER);
    fill(used > total ? color(200, 65, 65) : color(...this.C.tabInactive));
    drawingContext.letterSpacing = '1px';
    text(`${used}/${total} RP`, sx + sw - 14, midY);
    drawingContext.letterSpacing = '0px';
    // Divider
    stroke(...this.C.divider);
    strokeWeight(1);
    line(sx + 10, this.sidebarY + this.HEADER_H, sx + sw - 10, this.sidebarY + this.HEADER_H);
  }

  drawContent() {
    const { sidebarX: sx, sidebarW: sw } = this;
    const contentX = sx + this.CONTENT_PAD;
    const contentY = this.sidebarY + this.HEADER_H + this.TAB_H + 6;
    const contentW = sw - this.CONTENT_PAD * 2 - this.SCROLLBAR_W - 4;
    const contentH = this.sidebarH - this.HEADER_H - this.TAB_H - this.FOOTER_H - 6;
    this.lastContentBounds = { contentX, contentY, contentW, contentH };
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(contentX, contentY, contentW + this.SCROLLBAR_W + 4, contentH);
    drawingContext.clip();
    if(this.relics) {
        for (let i = 0; i < this.relics.length; i++) {
        const cy = contentY + 6 + i * (this.CARD_H + this.CARD_GAP_Y) - this.scrollY;
        if (cy + this.CARD_H < contentY || cy > contentY + contentH) continue;
        this.drawRelicCard(this.relics[i], i, contentX, cy, contentW);
        }
    }
    drawingContext.restore();
  }

  drawRelicCard(relic, index, cx, cy, cw) {
    const ch = this.CARD_H;
    const isActive = relic.active;
    const isHover = this.hoverRelicIndex === index;
    const canToggle= isActive || this.canActivateMore();
    const pulse = sin(this.animTimer * 2.2 + index * 0.7) * 0.5 + 0.5;
    // Background
    noStroke();
    fill(isActive ? color(...this.C.cardActiveBg) : color(...this.C.cardInactiveBg));
    rect(cx, cy, cw, ch, 4);
    // Border
    if (isActive) {
      stroke(...this.C.cardActiveBorder, 170 + pulse * 70);
      strokeWeight(isHover ? 2 : 1.5);
    } else {
      stroke(isHover ? color(...this.C.cardHoverBorder, 110) : color(...this.C.cardInactiveBorder));
      strokeWeight(1);
    }
    noFill();
    rect(cx, cy, cw, ch, 4);
    //Sprite & icon circle
    const iconX = cx + 26;
    const iconY = cy + ch / 2;
    noStroke();
    fill(isActive ? color(0, 130, 42, 85) : color(18, 40, 20, 85));
    circle(iconX, iconY, 38);
    if (relic.sprite && !relic.spriteImg && !relic.spriteLoading) {
        relic.spriteLoading = true;
        loadImage(relic.sprite, img => {
            relic.spriteImg = img;
            relic.spriteLoading = false;
        });
    }
    if (relic.spriteImg) {
        imageMode(CENTER);
        tint(isActive ? 255 : 160);
        image(relic.spriteImg, iconX, iconY, 32, 32);
        noTint();
        imageMode(CORNER);
    }
    //relic name
    const nameY = cy + ch / 2;
    textFont('Georgia');
    textStyle(isActive ? BOLD : NORMAL);
    textSize(13);
    textAlign(LEFT, CENTER);
    noStroke();
    fill(isActive ? color(...this.C.nameActive) : color(...this.C.nameInactive));
    text(relic.name, cx + 50, nameY);
    textStyle(NORMAL);
    // Status (bottom right)
    textFont('monospace');
    textSize(12);
    textAlign(RIGHT, BOTTOM);
    if (isActive) {
      fill(...this.C.rActive);
      text('● ACTIVE', cx + cw - 6, cy + ch - 5);
    } else if (!canToggle) {
      fill(...this.C.rLocked);
      text('NO POINTS', cx + cw - 6, cy + ch - 5);
    } else {
      fill(...this.C.rCost);
      text('1 RP  ○', cx + cw - 6, cy + ch - 5);
    }
    textAlign(LEFT, BASELINE);
  }

  drawFooter() {
    const { sidebarX: sx, sidebarW: sw, sidebarH: sh } = this;
    const fy = sh - this.FOOTER_H;

    stroke(...this.C.divider);
    strokeWeight(1);
    line(sx + 10, fy, sx + sw - 10, fy);
    // Label
    textFont('monospace');
    textSize(16);
    textAlign(LEFT, TOP);
    noStroke();
    fill(...this.C.footerLabel);
    drawingContext.letterSpacing = '1.5px';
    text('RECOLLECTION', sx + 14, fy + 10);
    // Point pips
    const used = this.activeCount();
    const total = this.totalPoints;
    const pipMax = max(total, used);
    const pipSize = 8;
    const pipGap = 12;
    const pipsW = pipMax * pipGap - (pipGap - pipSize);
    const pipStartX = sx + sw / 2 - pipsW / 2;
    const pipY = fy + 36;
    for (let i = 0; i < pipMax; i++) {
      const px = pipStartX + i * pipGap;
      if (i < used) {
        drawingContext.shadowBlur = 6;
        drawingContext.shadowColor = 'rgba(0,195,55,0.7)';
        fill(...this.C.pointUsed);
      } else if (i < total) {
        drawingContext.shadowBlur = 0;
        fill(...this.C.pointAvail);
      } else {
        drawingContext.shadowBlur = 0;
        fill(...this.C.pointOver);
      }
      noStroke();
      circle(px, pipY, pipSize);
    }
    drawingContext.shadowBlur = 0;
  }


  drawTooltip(relic) {
    const tw = 200;
    const th = 100;
    // Always open left of bar
    let tx = this.sidebarX - tw - 14;
    let ty = mouseY - 10;
    ty = constrain(ty, 4, height - th - 4);

    push();
    noStroke();
    fill(...this.C.tooltipBg);
    rect(tx, ty, tw, th, 4);

    stroke(...this.C.tooltipBorder, 140);
    strokeWeight(1);
    noFill();
    rect(tx, ty, tw, th, 4);

    noStroke();
    textFont('Georgia');
    textStyle(BOLD);
    textSize(16);
    textAlign(LEFT, TOP);
    fill(...this.C.tooltipTitle);
    text(relic.name, tx + 10, ty + 9);
    textStyle(NORMAL);

    textFont('monospace');
    textSize(14);
    fill(...this.C.tooltipText);
    text(relic.description || relic.shortDesc || '', tx + 10, ty + 26, tw - 20);
    pop();
  }

  mousePressed() {
    const tabIdx = this.getTabAtMouse();
    if (tabIdx >= 0) {
      this.activeTab = this.tabs[tabIdx];
      this.scrollY = 0;
      this.hoverRelicIndex = -1;
      return true;
    }
    const relicIdx = this.getRelicAtMouse();
    if (relicIdx >= 0) {
      this.toggleRelic(relicIdx);
      return true;
    }
    return false;
  }

  mouseMoved() {
    this.hoverRelicIndex = this.getRelicAtMouse();
  }

  mouseDragged() { this.mouseMoved(); }

  mouseWheel(event) {
    if (!this.mouseOverSidebar()) return false;
    this.scrollY = constrain(
      this.scrollY + event.delta * 0.35,
      0,
      this.maxScroll()
    );
    return true;
  }

  activeCount() {
    return this.relics.filter(r => r.active).length;
  }
  canActivateMore() {
    return this.activeCount() < this.totalPoints;
  }

  maxScroll() {
    if (!this.lastContentBounds) return 0;
    const totalCardH = this.relics.length * this.CARD_H + (this.relics.length - 1) * this.CARD_GAP_Y + 12;
    return max(0, totalCardH - this.lastContentBounds.contentH);
  }

  mouseOverSidebar() {
    return mouseX >= this.sidebarX;
  }

  getTabAtMouse() {
    const tabY = this.sidebarY + this.HEADER_H;
    if (mouseY < tabY || mouseY > tabY + this.TAB_H) return -1;
    if (!this.mouseOverSidebar()) return -1;
    const tabW = (this.sidebarW - 16) / this.tabs.length;
    for (let i = 0; i < this.tabs.length; i++) {
      const tx = this.sidebarX + 8 + i * tabW;
      if (mouseX >= tx && mouseX <= tx + tabW) return i;
    }
    return -1;
  }

  getRelicAtMouse() {
    const bounds = this.lastContentBounds;
    if (!bounds) return -1;
    const { contentX, contentY, contentW, contentH } = bounds;
    if (mouseX < contentX || mouseX > contentX + contentW) return -1;
    if (mouseY < contentY || mouseY > contentY + contentH) return -1;
    for (let i = 0; i < this.relics.length; i++) {
      const cy = contentY + 6 + i * (this.CARD_H + this.CARD_GAP_Y) - this.scrollY;
      if (mouseY >= cy && mouseY <= cy + this.CARD_H) return i;
    }
    return -1;
  }

  toggleRelic(index) {
    if (index < 0 || index >= this.relics.length) return;
    const relic = this.relics[index];
    if (relic.active) {
      relic.active = false;
    } else if (this.canActivateMore()) {
      relic.active = true;
    }
    if (this.onRelicChanged) this.onRelicChanged(relic);
  }
  drawScrollBar() {
    const bounds = this.lastContentBounds;
    if (!bounds) return;
    const maxScroll = this.maxScroll();
    if (maxScroll <= 0) return;

    const trackX = bounds.contentX + bounds.contentW + 3;
    const trackY = bounds.contentY + 4;
    const trackH = bounds.contentH - 8;
    noStroke();
    fill(...this.C.scrollTrack);
    rect(trackX, trackY, this.SCROLLBAR_W, trackH, 2);

    const thumbRatio = bounds.contentH / (bounds.contentH + maxScroll);
    const thumbH = max(20, trackH * thumbRatio);
    const thumbY = trackY + (this.scrollY / maxScroll) * (trackH - thumbH);
    fill(...this.C.scrollBar);
    rect(trackX, thumbY, this.SCROLLBAR_W, thumbH, 2);
  }
}