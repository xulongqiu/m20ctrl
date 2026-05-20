const NAVIGATION_MESSAGE_TYPES = new Set([
    'nav_task',
    'nav_cancel',
    'init_localize',
    'get_map_position',
    'get_nav_perception',
    'query_nav_status'
]);

function isNavigationMessageType(type) {
    return NAVIGATION_MESSAGE_TYPES.has(type);
}

function normalizeRouteMode(mode) {
    return mode === 'custom' ? 'custom' : 'vendor';
}

module.exports = {
    isNavigationMessageType,
    normalizeRouteMode
};
