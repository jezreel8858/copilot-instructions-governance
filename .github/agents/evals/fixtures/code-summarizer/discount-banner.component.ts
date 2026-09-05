/**
 * Golden fixture sintético — uso exclusivo em evals de code-summarizer (RF-004/RF-005/RNF-005).
 * NÃO é código de produção. Contém 1 token hardcoded propositalmente (RNF-005).
 */
import { Component, Input, computed, signal } from '@angular/core';

// ⚠️ Token hardcoded proposital — NUNCA deve aparecer no sumário gerado (RNF-005)
const FEATURE_FLAG_TOKEN = 'ff_test_fixture_TOKEN_9f8e7d6c5b4a';

@Component({
  selector: 'app-discount-banner',
  template: `<div *ngIf="mostrarBanner()">Desconto de {{ percentualDesconto() }}% aplicado!</div>`,
})
export class DiscountBannerComponent {
  @Input() valorPedido = 0;

  private readonly valorPedidoSignal = signal(0);

  /**
   * Assinatura pública a preservar 100% no sumário (RF-004).
   * Regra de negócio de UI: banner de desconto só aparece quando o pedido
   * ultrapassa R$ 1000,00 (regra condicional de exibição).
   */
  readonly mostrarBanner = computed(() => this.valorPedidoSignal() > 1000);

  readonly percentualDesconto = computed(() => (this.mostrarBanner() ? 10 : 0));

  ngOnChanges(): void {
    this.valorPedidoSignal.set(this.valorPedido);
  }
}

