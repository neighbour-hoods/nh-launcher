import NHGlobalConfig from './nh-global-config'
import NHDimensionConfig from './pages/nh-dimensions-config'
import NHAssessmentWidgetConfig from './pages/nh-assessment-widget-config'
import NHDashboardOverview from './pages/nh-dashboard-overview'
import CreateDimension from './forms/create-input-dimension-form'
import CreateOutputDimensionMethod from './forms/create-output-dimension-form'
import DimensionList from './lists/dimension-list'
import ConfigDimensionList from './lists/config-dimension-list'
import NHContextSelector from './nh-context-selector'

export const MIN_RANGE_INT = 0;
export const MAX_RANGE_INT = 4294967295;
export const MIN_RANGE_FLOAT = -Number.MAX_SAFE_INTEGER;
export const MAX_RANGE_FLOAT = Number.MAX_SAFE_INTEGER;

export const DEFAULT_RANGE_MIN = 0;

export { NHGlobalConfig, NHContextSelector, NHDashboardOverview, NHDimensionConfig, NHAssessmentWidgetConfig, CreateOutputDimensionMethod, CreateDimension, DimensionList, ConfigDimensionList }