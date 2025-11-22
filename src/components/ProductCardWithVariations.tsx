"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Star } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  has_variations: boolean;
  earns_loyalty_points: boolean;
  loyns_loyalty_points_value: number;
  can_be_redeemed_with_points: boolean;
  redemption_points_cost: number;
  min_variation_price?: number;
  max_variation_price?: number;
  category_id?: string;
}

interface Variation {
  id: string;
  product_id: string;
  name: string;
  price_adjustment: number;
  stock_quantity: number;
  is_composite?: boolean; // Se é um item composto
  raw_material_product_id?: string;
  raw_material_variation_id?: string;
  yield_quantity?: number;
}

interface ProductCardWithVariationsProps {
  product: Product;
  productVariations: Variation[];
  isOutOfStock: boolean;
  isFavorite: boolean;
  toggleFavorite: (productId: string) => void;
  handleAddToCart: (product: Product, variation?: Variation) => void;
}

export default function ProductCardWithVariations({
  product,
  productVariations,
  isOutOfStock,
  isFavorite,
  toggleFavorite,
  handleAddToCart,
}: ProductCardWithVariationsProps) {
  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });

  return (
    <Card key={product.id} className={cn(
      "shadow-soft relative transition-all",
      isOutOfStock && 'opacity-60',
      isFavorite && 'ring-2 ring-yellow-500'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              {product.has_variations ? "Com variações" : `Estoque: ${product.stock_quantity}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite(product.id)}
            className="h-8 w-8"
          >
            <Star className={cn(
              "h-5 w-5 transition-colors",
              isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
            )} />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {product.has_variations ? (
              product.min_variation_price === product.max_variation_price ? (
                `R$ ${product.min_variation_price?.toFixed(2)}`
              ) : (
                `R$ ${product.min_variation_price?.toFixed(2)} - ${product.max_variation_price?.toFixed(2)}`
              )
            ) : (
              `R$ ${product.price.toFixed(2)}`
            )}
          </span>
          {product.has_variations ? (
            <div className="embla overflow-hidden w-fit max-w-[150px]" ref={emblaRef}>
              <div className="embla__container flex gap-1">
                {productVariations.map(variation => {
                  // Para itens compostos, não desabilitar o botão mesmo sem estoque
                  const isDisabled = variation.stock_quantity === 0 && !variation.is_composite;
                  return (
                    <Button
                      key={variation.id}
                      onClick={() => handleAddToCart(product, variation)}
                      className="embla__slide flex-shrink-0 h-10 w-10 p-0 text-sm font-bold"
                      variant="outline"
                      disabled={isDisabled}
                    >
                      {variation.name.charAt(0).toUpperCase()}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <Button
              onClick={() => handleAddToCart(product)}
              className="shadow-soft"
              disabled={isOutOfStock}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isOutOfStock ? "Sem Estoque" : "Adicionar"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}