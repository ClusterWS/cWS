#ifndef EXTENSIONS_CWS_H
#define EXTENSIONS_CWS_H

#include <string>

namespace cWS {

enum Options : unsigned int {
    NO_OPTIONS = 0,
    PERMESSAGE_DEFLATE = 1,
    SERVER_NO_CONTEXT_TAKEOVER = 2, // remove this
    CLIENT_NO_CONTEXT_TAKEOVER = 4, // remove this
    NO_DELAY = 8,
    SLIDING_DEFLATE_WINDOW = 16
};

template <bool isServer>
class ExtensionsNegotiator {
protected:
    int options;
public:
    ExtensionsNegotiator(int wantedOptions);
    std::string generateOffer();
    void readOffer(std::string offer);
    int getNegotiatedOptions();
};

}

#endif // EXTENSIONS_CWS_H
