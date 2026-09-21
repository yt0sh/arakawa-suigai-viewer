import {SOURCES,parseEvacuationData,makeJsonHandler} from '../lib/arakawa.mjs';
export default makeJsonHandler(SOURCES.evacuationData,parseEvacuationData);
