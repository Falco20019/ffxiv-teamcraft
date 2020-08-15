import { Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Item } from '../../../../model/garland-tools/item';
import { filter, map, shareReplay, switchMap } from 'rxjs/operators';
import { DataService } from '../../../../core/api/data.service';
import { RotationsFacade } from '../../../../modules/rotations/+state/rotations.facade';
import { SeoService } from '../../../../core/seo/seo.service';
import { SeoMetaConfig } from '../../../../core/seo/seo-meta-config';
import { LazyDataService } from '../../../../core/data/lazy-data.service';
import { Craft } from '@ffxiv-teamcraft/simulator';
import { AbstractSimulationPage } from '../../abstract-simulation-page';

@Component({
  selector: 'app-simulator-page',
  templateUrl: './simulator-page.component.html',
  styleUrls: ['./simulator-page.component.less']
})
export class SimulatorPageComponent extends AbstractSimulationPage {

  recipe$: Observable<Craft>;

  item$: Observable<Item>;

  thresholds$: Observable<number[]>;

  constructor(protected route: ActivatedRoute, private dataService: DataService,
              private rotationsFacade: RotationsFacade, private router: Router,
              protected seo: SeoService, private lazyData: LazyDataService) {
    super(route, seo);
    this.route.paramMap.pipe(
      map(params => params.get('rotationId'))
    ).subscribe(id => {
      if (id === null) {
        this.rotationsFacade.createRotation();
        this.rotationsFacade.selectRotation(undefined);
      } else {
        this.rotationsFacade.getRotation(id);
        this.rotationsFacade.selectRotation(id);
      }
    });

    this.item$ = this.route.paramMap.pipe(
      switchMap(params => {
        return this.dataService.getItem(+params.get('itemId'));
      }),
      map(itemData => itemData.item),
      shareReplay(1)
    );

    this.thresholds$ = this.item$.pipe(
      map(item => {
        if (item.collectable === 1) {
          // If it's a delivery item
          if (item.satisfaction !== undefined) {
            // We want thresholds on quality, not collectable score.
            return item.satisfaction[0].rating.map(r => r * 10);
          } else if (item.masterpiece !== undefined) {
            return item.masterpiece.rating.map(r => r * 10);
          } else if (this.lazyData.data.collectables[item.id] !== undefined) {
            const supply = this.lazyData.data.collectables[item.id];
            return [
              supply.base.rating * 10,
              supply.mid.rating * 10,
              supply.high.rating * 10
            ];
          }
        }
        return [];
      })
    );

    this.recipe$ = this.route.paramMap.pipe(
      switchMap(params => {
        return this.item$.pipe(
          switchMap(item => {
            if (params.get('recipeId') === null && item.craft.length > 0) {
              this.router.navigate([item.craft[0].id], { relativeTo: this.route });
              return this.lazyData.getRecipe(params.get('recipeId'));
            }
            return this.lazyData.getRecipe(params.get('recipeId'));
          })
        );
      }),
      shareReplay(1)
    );
  }


  protected getSeoMeta(): Observable<Partial<SeoMetaConfig>> {
    return combineLatest([this.rotationsFacade.selectedRotation$, this.recipe$, this.item$]).pipe(
      filter(([, recipe]) => recipe !== undefined),
      map(([rotation, recipe, item]) => {
        return {
          title: rotation.getName(),
          description: `rlvl ${recipe.rlvl}, ${recipe.durability} durability, ${rotation.rotation.length} steps`,
          url: `https://ffxivteamcraft.com/simulator/${item.id}/${recipe.id}/${rotation.$key}`
        };
      })
    );
  }

}
