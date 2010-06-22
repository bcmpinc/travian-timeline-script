Travian/Imperion Time Line
=================
A greasemonkey script that improves the Travian and Imperion user-interfaces.

This script improves the information provided by Travian or Imperion. 
For example: by adding a timeline that shows different events like completion 
of build tasks and the arrival of armies. It does this by modify the html 
of the page.

This script is completely passive, so it does not click links automatically 
or send http requests. This means that for certain data to be collected you 
have to read your reports and watch your ally page and allies profiles.

Installation
------------
The easiest way to install and use this script is going to:
http://userscripts.org/scripts/show/38650

However, for development this is not an option. In this case, create a git
clone of the repository. The script can be installed by loading the 
``travian_time_line.user.js`` file in firefox. This will install the script,
which will create a copy of your checkout. To make greasemonkey use your 
working copy, remove the folder ``~/.mozilla/firefox/*/gm_scripts/travian_time_line`` 
and replace it with a symlink to your working copy. 

If your operating system does not support symlinks, move your git clone
instead and create a shortcut to your git clone for easy access. In this 
case you must rename your git clone's folder name to ``travian_time_line``.

Once you've done this, any change to the script will be applied when you 
(re)load the travian webpage.

Compilation
-----------
The ``conv.pl`` script can be used to concatenate the required script
files, compact these script files and remove code specific to a different 
game. What is filtered is defined in the ``*_time_line.user.js`` file 
using a simple boolean assignment. The ``@require``-lines and the boolean
assignment lines will be removed from the resulting script.

Code specific for one of the games can be included between if statements:
``if (travian) { ... } if (imperion) { ... }``. The brackets are mandatory.
Also the if statments can not be used in conjunction with ``else``. For
game specific variables, use ``(travian?'red':'green')``. The surrounding
parens are mandatory. These ternary operator constructions can be nested.
It is *not* possible to use boolean operators: ``if (travian || imperion) {}``
can not be handled.


