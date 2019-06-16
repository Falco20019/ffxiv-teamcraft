import { RotationTip } from '../rotation-tip';
import { InnerQuiet, SimulationResult } from '@ffxiv-teamcraft/simulator';
import { RotationTipType } from '../rotation-tip-type';

export class UseInnerQuietBeforeQuality extends RotationTip {

  constructor() {
    super(RotationTipType.WARNING, 'Use_inner_quiet_before_quality_increase');
  }

  canBeAppliedTo(simulationResult: SimulationResult): boolean {
    return simulationResult.steps.some(step => step.addedQuality > 0);
  }

  matches(simulationResult: SimulationResult): boolean {
    const iqIndex = simulationResult.steps.findIndex(step => step.action.is(InnerQuiet));
    const firstQualityAction = simulationResult.steps.findIndex(step => step.addedQuality > 0);
    return iqIndex > firstQualityAction;
  }

}
